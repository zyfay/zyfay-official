// pages/api/admin/game-sync.js
// Sinkron produk game & voucher dari TokoVoucher. Hanya admin.
//   GET   -> pengaturan margin + daftar game (foto, jumlah produk, margin yang berlaku)
//   PUT   -> simpan pengaturan: { margin_percent?, margin_flat?, round_to?, auto_add?, per_game?: {id: {...}|null}, mapping?: {id: [operator_id]|null} }
//   POST  -> { preview?: true, apply_anomalies?: false }  preview = hitung saja; tanpa preview = tulis ke database
//   POST  -> { action: 'operators', q: 'free fire' }            cari operator TokoVoucher (untuk menghubungkan game manual)
//   POST  -> { action: 'games_preview' }                          daftar game baru di TokoVoucher yang belum ada di toko
//   POST  -> { action: 'games_import', operator_ids: [..], active?: false }  buat game baru + produknya
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { tv, isTvIpBlocked } from '../../../lib/tokovoucher';
import { mergeConfig, marginFor, buildTvIndex, planGame, planNewGames, buildNewGame, ANOMALY_RATIO } from '../../../lib/gamesync';

export const config = { maxDuration: 60 };

const KEY = 'game_sync';
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const truthy = v => v === true || v === '1' || v === 'true' || v === 1;
const ID = /^[a-z0-9-]{1,40}$/;

async function loadConfig() {
  const { data } = await supabaseAdmin.from('site_settings').select('value').eq('key', KEY).maybeSingle();
  return mergeConfig(data?.value);
}
async function saveConfig(cfg) {
  const { error } = await supabaseAdmin.from('site_settings').upsert({ key: KEY, value: cfg, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
async function allProducts() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin.from('products')
      .select('id, name, game_id, tv_code, price, is_active, sort_order').range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}
const publicCfg = cfg => ({ margin_percent: cfg.margin_percent, margin_flat: cfg.margin_flat, round_to: cfg.round_to, auto_add: cfg.auto_add, per_game: cfg.per_game, mapping: cfg.mapping });

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized: login admin dulu' });

  try {
    // ---------- GET ----------
    if (req.method === 'GET') {
      const cfg = await loadConfig();
      const { data: games, error } = await supabaseAdmin.from('games').select('id, name, publisher, category, image_url, is_active, sort_order').order('sort_order');
      if (error) return res.status(500).json({ success: false, message: error.message });
      const counts = {};
      (await allProducts()).forEach(p => { if (p.game_id && !p.game_id.startsWith('ppob-')) counts[p.game_id] = (counts[p.game_id] || 0) + 1; });
      return res.json({
        success: true, config: publicCfg(cfg),
        games: (games || []).map(g => {
          const m = marginFor(cfg, g.id), o = cfg.per_game[g.id] || {};
          return { ...g, products: counts[g.id] || 0, margin: { percent: m.marginPercent, flat: m.marginFlat, enabled: m.enabled, custom_percent: o.margin_percent ?? null, custom_flat: o.margin_flat ?? null } };
        }),
      });
    }

    // ---------- PUT ----------
    if (req.method === 'PUT') {
      const b = req.body || {};
      const cfg = await loadConfig();
      const bad = m => res.status(400).json({ success: false, message: m });
      const inRange = (v, lo, hi) => v !== '' && v !== null && Number.isFinite(Number(v)) && Number(v) >= lo && Number(v) <= hi;

      if (b.margin_percent !== undefined) { if (!inRange(b.margin_percent, 0, 30)) return bad('Margin % harus 0 sampai 30'); cfg.margin_percent = Number(b.margin_percent); }
      if (b.margin_flat !== undefined) { if (!inRange(b.margin_flat, 0, 10000)) return bad('Margin tetap harus 0 sampai 10.000'); cfg.margin_flat = Number(b.margin_flat); }
      if (b.round_to !== undefined) { if (!inRange(b.round_to, 1, 1000)) return bad('Pembulatan harus 1 sampai 1.000'); cfg.round_to = Number(b.round_to); }
      if (b.auto_add !== undefined) cfg.auto_add = !!b.auto_add;

      if (b.per_game && typeof b.per_game === 'object') {
        for (const [gid, o] of Object.entries(b.per_game)) {
          if (!ID.test(gid)) return bad('id game tidak valid');
          if (o === null) { delete cfg.per_game[gid]; continue; }
          const next = { ...(cfg.per_game[gid] || {}) };
          if (o.enabled !== undefined) { if (o.enabled === false) next.enabled = false; else delete next.enabled; }
          for (const f of ['margin_percent', 'margin_flat']) {
            if (o[f] === undefined) continue;
            if (o[f] === null || o[f] === '') { delete next[f]; continue; }
            if (!inRange(o[f], 0, f === 'margin_percent' ? 30 : 10000)) return bad(`${f} di luar batas`);
            next[f] = Number(o[f]);
          }
          if (Object.keys(next).length) cfg.per_game[gid] = next; else delete cfg.per_game[gid];
        }
      }
      if (b.mapping && typeof b.mapping === 'object') {
        for (const [gid, ids] of Object.entries(b.mapping)) {
          if (!ID.test(gid)) return bad('id game tidak valid');
          if (ids === null) { delete cfg.mapping[gid]; continue; }
          if (!Array.isArray(ids) || ids.length > 5 || !ids.every(x => Number.isInteger(Number(x)) && Number(x) > 0)) return bad('mapping operator tidak valid');
          cfg.mapping[gid] = ids.map(Number);
        }
      }
      await saveConfig(cfg);
      return res.json({ success: true, config: publicCfg(cfg) });
    }

    if (req.method !== 'POST') return res.status(405).end();

    // ---------- POST: preview / sinkron ----------
    if (!tv.isConfigured()) return res.status(400).json({ success: false, message: 'TokoVoucher belum dikonfigurasi (env TOKOVOUCHER_*)' });
    const body = req.body || {};
    const preview = truthy(body.preview);
    const applyAnomalies = truthy(body.apply_anomalies);

    let full;
    try { full = await tv.getFullProducts(); } catch (e) { return res.status(502).json({ success: false, message: 'Gagal menghubungi TokoVoucher: ' + e.message }); }
    if (isTvIpBlocked(full)) return res.status(502).json({ success: false, code: 'tv_ip_not_allowed', message: 'TokoVoucher menolak: IP server belum di-whitelist ("Ip Not Allow").' });
    if (Number(full?.status) !== 1 || !full?.data) return res.status(502).json({ success: false, message: 'Respons TokoVoucher tidak valid: ' + (full?.error_msg || full?.message || 'tanpa pesan') });

    const cfg = await loadConfig();
    const index = buildTvIndex(full);

    // Cari operator TokoVoucher berdasarkan nama (untuk menghubungkan game secara manual)
    if (body.action === 'operators') {
      const q = String(body.q || '').toLowerCase().trim();
      if (q.length < 2) return res.status(400).json({ success: false, message: 'Ketik minimal 2 huruf' });
      const list = index.operators
        .filter(o => `${o.name} ${o.category}`.toLowerCase().includes(q))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
        .slice(0, 40);
      return res.json({ success: true, mode: 'operators', operators: list });
    }
    const { data: games, error: gErr } = await supabaseAdmin.from('games').select('id, name, publisher, category, is_active, sort_order').order('sort_order');
    if (gErr) return res.status(500).json({ success: false, message: gErr.message });
    const products = await allProducts();
    const claimed = new Set(products.filter(p => p.tv_code).map(p => String(p.tv_code).toLowerCase().trim()));
    const byGame = {};
    products.forEach(p => { if (p.game_id && !p.game_id.startsWith('ppob-')) (byGame[p.game_id] ||= []).push(p); });

    const plans = (games || []).map(g => planGame({ game: g, products: byGame[g.id] || [], tv: index, cfg, claimed, applyAnomalies }));

    // ---- Game baru dari TokoVoucher ----
    if (body.action === 'games_preview' || body.action === 'games_import') {
      const linked = new Set(plans.flatMap(p => p.operator_ids));
      const found = planNewGames({ tv: index, games: games || [], linkedOperatorIds: linked, cfg, claimed });
      if (body.action === 'games_preview') {
        return res.json({
          success: true, mode: 'games_preview',
          candidates: found.candidates.map(c => ({ operator_id: c.operator_id, name: c.name, logo: c.logo, category: c.category, tv_category: c.tv_category, products: c.products, slug: c.slug, fields: c.fields.map(f => f.label).join(' + ') })),
          similar: found.similar, skipped_categories: found.skipped_categories,
        });
      }
      const wanted = Array.isArray(body.operator_ids) ? [...new Set(body.operator_ids.map(Number).filter(n => Number.isInteger(n) && n > 0))].slice(0, 300) : [];
      if (!wanted.length) return res.status(400).json({ success: false, message: 'Pilih minimal satu game' });
      const picked = found.candidates.filter(c => wanted.includes(c.operator_id)); // hanya kandidat yang memang valid dari data TokoVoucher terbaru
      if (!picked.length) return res.status(400).json({ success: false, message: 'Game yang dipilih sudah ada atau tidak valid' });
      const active = body.active === true;
      const maxSort = (games || []).reduce((m, g) => Math.max(m, Number(g.sort_order) || 0), 0);
      const built = picked.map((c, i) => buildNewGame(c, maxSort + i + 1, active));

      const { error: insErr } = await supabaseAdmin.from('games').insert(built.map(b => b.game));
      if (insErr) return res.status(500).json({ success: false, message: 'Gagal membuat game: ' + insErr.message });
      const errors = []; let createdProducts = 0;
      for (const part of chunk(built.flatMap(b => b.products), 200)) {
        const { error } = await supabaseAdmin.from('products').insert(part);
        if (error) errors.push('produk: ' + error.message); else createdProducts += part.length;
      }
      return res.json({
        success: true, mode: 'games_import', active,
        created_games: built.length, created_products: createdProducts, ignored: wanted.length - picked.length,
        games: built.map(b => ({ id: b.game.id, name: b.game.name, category: b.game.category, products: b.products.length, fields: b.game.fields.map(f => f.label).join(' + ') })),
        errors: errors.slice(0, 5),
      });
    }
    const totals = plans.reduce((t, p) => {
      for (const k of ['up', 'down', 'unchanged', 'new', 'deactivated', 'reactivated', 'anomalies', 'missing']) t[k] += p.stats[k];
      return t;
    }, { up: 0, down: 0, unchanged: 0, new: 0, deactivated: 0, reactivated: 0, anomalies: 0, missing: 0 });

    const view = plans.map(p => ({
      game_id: p.game_id, name: p.name, enabled: p.enabled, operators: p.operators, mapped_from: p.mapped_from,
      stats: p.stats, samples: p.samples, anomalies: p.anomalies.slice(0, 10), suggestions: p.suggestions,
    }));
    const out = { success: true, mode: preview ? 'preview' : 'sync', anomaly_limit_percent: ANOMALY_RATIO * 100, totals, games: view };
    if (preview) return res.json(out);

    // ---- tulis ke database ----
    const errors = [];
    let written = { updated: 0, inserted: 0 };
    const now = new Date().toISOString();
    const updates = plans.flatMap(p => p.updates);
    for (const part of chunk(updates, 25)) {
      const results = await Promise.all(part.map(u => supabaseAdmin.from('products').update({ ...u.patch, updated_at: now }).eq('id', u.id)));
      results.forEach(r => { if (r.error) errors.push('update: ' + r.error.message); else written.updated++; });
    }
    for (const part of chunk(plans.flatMap(p => p.inserts), 200)) {
      const { error } = await supabaseAdmin.from('products').insert(part);
      if (error) errors.push('insert: ' + error.message); else written.inserted += part.length;
    }
    // Catat produk yang dimatikan OLEH sinkron (supaya dihidupkan lagi otomatis saat TokoVoucher membukanya),
    // dan jangan pernah menyentuh produk yang dimatikan manual.
    const off = new Set(cfg.state.auto_off);
    plans.forEach(p => { p.autoOffAdd.forEach(id => off.add(id)); p.autoOffRemove.forEach(id => off.delete(id)); });
    try { await saveConfig({ ...cfg, state: { auto_off: [...off] } }); } catch (e) { errors.push('state: ' + e.message); }

    return res.status(errors.length && !written.updated && !written.inserted ? 500 : 200).json({ ...out, written, errors: errors.slice(0, 5) });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

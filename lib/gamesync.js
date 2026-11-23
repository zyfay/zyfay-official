// lib/gamesync.js
// Sinkron produk GAME & VOUCHER dari TokoVoucher: harga mengikuti harga modal + margin, produk baru ditambah,
// produk yang ditutup TokoVoucher dimatikan. Admin cukup mengatur margin dan foto.
import { sellPrice } from './ppob';

export const DEFAULT_CONFIG = { margin_percent: 3, margin_flat: 300, round_to: 100, auto_add: true, per_game: {}, mapping: {}, state: { auto_off: [] } };
export const ANOMALY_RATIO = 0.35; // perubahan harga > 35% ditahan dulu (jaga-jaga harga TokoVoucher error)

const num = (v, d) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? d : Number(v));
const int = v => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : 0; };
const low = x => String(x ?? '').toLowerCase();
const plainObj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function mergeConfig(raw) {
  const r = plainObj(raw);
  return {
    margin_percent: num(r.margin_percent, DEFAULT_CONFIG.margin_percent),
    margin_flat: num(r.margin_flat, DEFAULT_CONFIG.margin_flat),
    round_to: Math.max(1, num(r.round_to, DEFAULT_CONFIG.round_to)),
    auto_add: r.auto_add === undefined ? DEFAULT_CONFIG.auto_add : !!r.auto_add,
    per_game: plainObj(r.per_game),
    mapping: plainObj(r.mapping),
    state: { auto_off: Array.isArray(r.state?.auto_off) ? r.state.auto_off : [] },
  };
}

// Margin yang berlaku untuk satu game: override per game menimpa nilai global (per bidang).
export function marginFor(cfg, gameId) {
  const o = plainObj(cfg.per_game?.[gameId]);
  return {
    marginPercent: num(o.margin_percent, cfg.margin_percent),
    marginFlat: num(o.margin_flat, cfg.margin_flat),
    roundTo: cfg.round_to,
    enabled: o.enabled !== false,
  };
}

// Produk yang bukan barang dagangan: "Cek ID ...", transfer, atau modal di bawah Rp 500.
export function specialReason(nama, cost) {
  if (/\bcek\b/i.test(String(nama || ''))) return 'cek';
  if (/\btransfer\b/i.test(String(nama || ''))) return 'transfer';
  if (cost > 0 && cost < 500) return 'terlalu-murah';
  return null;
}

const norm = s => low(s).replace(/[^a-z0-9]+/g, ' ').trim();

// Tebak operator TokoVoucher yang cocok dengan nama game (untuk game yang belum punya produk).
export function suggestOperators(game, operators) {
  const g = norm(game.name);
  const gTokens = new Set(g.split(' ').filter(Boolean));
  return operators
    .map(o => {
      const n = norm(o.name);
      if (!n || !g) return null;
      let score = 0;
      if (n === g) score = 100;
      else if (n.includes(g) || g.includes(n)) score = 70 + Math.round((Math.min(n.length, g.length) / Math.max(n.length, g.length)) * 20);
      else {
        const oTokens = new Set(n.split(' ').filter(Boolean));
        const inter = [...gTokens].filter(t => oTokens.has(t)).length;
        const jac = inter / (gTokens.size + oTokens.size - inter);
        if (jac >= 0.5) score = Math.round(jac * 60);
      }
      return score >= 50 ? { operator_id: o.id, name: o.name, category: o.category, products: o.products, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Susun indeks dari data TokoVoucher (/member/produk/full)
export function buildTvIndex(full) {
  const d = full?.data || {};
  const byId = list => new Map((list || []).map(x => [Number(x.id), x]));
  const cats = byId(d.category), ops = byId(d.operator), jns = byId(d.jenis);
  const byCode = new Map(), byOperator = new Map(), opInfo = new Map();
  for (const p of d.produk || []) {
    const op = ops.get(Number(p.operator_id)) || {};
    const jn = jns.get(Number(p.jenis_id)) || {};
    const cat = cats.get(Number(p.kategori_id)) || {};
    const entry = {
      p, op, jn, cat, cost: int(p.price),
      active: Number(p.status) === 1 && Number(op.status ?? 1) === 1 && Number(jn.status ?? 1) === 1,
    };
    const code = low(p.kode_produk).trim();
    if (code) byCode.set(code, entry);
    const oid = Number(p.operator_id);
    if (!byOperator.has(oid)) byOperator.set(oid, []);
    byOperator.get(oid).push(entry);
    const info = opInfo.get(oid) || { id: oid, name: op.nama || `operator ${oid}`, category: cat.nama || '', products: 0 };
    info.products++;
    opInfo.set(oid, info);
  }
  return { byCode, byOperator, operators: [...opInfo.values()] };
}

// Rencana perubahan untuk SATU game. Tidak menyentuh database.
export function planGame({ game, products, tv, cfg, claimed, applyAnomalies = false }) {
  const margin = marginFor(cfg, game.id);
  const autoOff = new Set(cfg.state.auto_off);
  const out = {
    game_id: game.id, name: game.name, enabled: margin.enabled,
    operators: [], mapped_from: null,
    updates: [], inserts: [], anomalies: [], autoOffAdd: [], autoOffRemove: [],
    stats: { products: products.length, up: 0, down: 0, unchanged: 0, new: 0, deactivated: 0, reactivated: 0, missing: 0, no_cost: 0, anomalies: 0 },
    samples: [], suggestions: [],
  };
  if (!margin.enabled) return out;

  // Operator TokoVoucher milik game ini: pemetaan manual, kalau tidak ada diambil dari tv_code produk yang sudah ada
  const mapped = cfg.mapping?.[game.id];
  let opIds;
  if (Array.isArray(mapped) && mapped.length) { opIds = mapped.map(Number); out.mapped_from = 'manual'; }
  else {
    const s = new Set();
    for (const p of products) { const e = p.tv_code && tv.byCode.get(low(p.tv_code).trim()); if (e) s.add(Number(e.p.operator_id)); }
    opIds = [...s]; out.mapped_from = opIds.length ? 'produk' : null;
  }
  out.operators = opIds.map(id => tv.operators.find(o => o.id === id)?.name || `operator ${id}`);
  if (!opIds.length) {
    const gameOps = tv.operators.filter(o => /game|voucher/i.test(o.category));
    out.suggestions = suggestOperators(game, gameOps.length ? gameOps : tv.operators);
  }

  // 1) Produk yang sudah ada
  for (const p of products) {
    if (!p.tv_code) continue;
    const e = tv.byCode.get(low(p.tv_code).trim());
    const patch = {};
    const sample = { code: p.tv_code, name: p.name, old: p.price, modal: e?.cost ?? null };
    if (!e) {
      out.stats.missing++;
      if (p.is_active) { patch.is_active = false; out.autoOffAdd.push(p.id); out.stats.deactivated++; }
    } else {
      if (!e.active && p.is_active) { patch.is_active = false; out.autoOffAdd.push(p.id); out.stats.deactivated++; }
      if (e.active && !p.is_active && autoOff.has(p.id)) { patch.is_active = true; out.autoOffRemove.push(p.id); out.stats.reactivated++; }
      if (e.cost > 0) {
        const target = sellPrice(e.cost, margin);
        sample.new = target;
        if (target === p.price) out.stats.unchanged++;
        else if (p.price > 0 && Math.abs(target - p.price) / p.price > ANOMALY_RATIO && !applyAnomalies) {
          out.stats.anomalies++;
          out.anomalies.push({ id: p.id, code: p.tv_code, name: p.name, old: p.price, new: target, modal: e.cost });
        } else {
          patch.price = target;
          if (target > p.price) out.stats.up++; else out.stats.down++;
        }
      } else out.stats.no_cost++;
    }
    if (Object.keys(patch).length) {
      out.updates.push({ id: p.id, patch });
      if (out.samples.length < 4 && patch.price !== undefined) out.samples.push(sample);
    }
  }

  // 2) Produk baru milik operator yang terhubung
  if (cfg.auto_add) {
    const fresh = [];
    for (const oid of opIds) {
      for (const e of tv.byOperator.get(oid) || []) {
        const code = low(e.p.kode_produk).trim();
        if (!code || claimed.has(code) || !e.active || e.cost <= 0) continue;
        if (specialReason(e.p.nama, e.cost)) continue;
        claimed.add(code);
        fresh.push(e);
      }
    }
    fresh.sort((a, b) => a.cost - b.cost);
    const base = products.reduce((m, p) => Math.max(m, Number(p.sort_order) || 0), 0);
    fresh.forEach((e, i) => out.inserts.push({
      name: e.p.nama, description: e.p.deskripsi || null,
      category: game.category === 'voucher' ? 'voucher' : 'topup',
      game_id: game.id, game_name: game.name, publisher: game.publisher || null, image_url: null,
      tv_code: String(e.p.kode_produk).trim(),
      price: sellPrice(e.cost, margin), original_price: 0, is_active: true, sort_order: base + (i + 1) * 10,
      metadata: { source: 'tokovoucher', tv_price: e.cost, synced_at: new Date().toISOString() },
    }));
    out.stats.new = out.inserts.length;
    if (out.samples.length < 4) out.inserts.slice(0, 4 - out.samples.length).forEach(r => out.samples.push({ code: r.tv_code, name: r.name, old: null, new: r.price, modal: r.metadata.tv_price, baru: true }));
  }
  return out;
}

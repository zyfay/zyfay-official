// pages/api/admin/ppob/import.js
// Impor produk PPOB dari TokoVoucher ke tabel products (game_id: ppob-pulsa, ppob-paket-data, dst).
//   GET  /api/admin/ppob/import            -> PREVIEW saja (tidak menulis apa pun)
//   POST /api/admin/ppob/import            -> body: { preview?, margin_percent?, margin_flat?, round_to?, update_prices? }
// Hanya admin (cookie admin_token).
import { getAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { tv, isTvIpBlocked } from '../../../../lib/tokovoucher';
import { PPOB_GROUPS, classifyProduct, sellPrice } from '../../../../lib/ppob';

export const config = { maxDuration: 60 };

const truthy = v => v === true || v === '1' || v === 'true' || v === 1;
const num = (v, d) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? d : Number(v));
const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
// Produk yang BUKAN barang dagangan: "Cek Nama Akun Dana", "Cek Status Voucher ...", "Cek Hutang Pulsa ..."
// (harganya cuma Rp 4-10 per cek), transfer pulsa, dan apa pun yang modalnya di bawah Rp 500.
function specialReason(nama, cost) {
  if (/\bcek\b/i.test(nama)) return 'cek';
  if (/\btransfer\b/i.test(nama)) return 'transfer';
  if (cost > 0 && cost < 500) return 'terlalu-murah';
  return null;
}
const plainObj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized: login admin dulu' });
  if (!tv.isConfigured()) return res.status(400).json({ success: false, message: 'TokoVoucher belum dikonfigurasi (env TOKOVOUCHER_*)' });

  const src = req.method === 'POST' ? (req.body || {}) : req.query;
  const preview = req.method === 'GET' || truthy(src.preview);
  const margin = {
    marginPercent: num(src.margin_percent, 3),
    marginFlat: num(src.margin_flat, 0),
    roundTo: Math.max(1, num(src.round_to, 100)),
  };
  const updatePrices = truthy(src.update_prices);

  // ---- 1) Ambil semua data produk dari TokoVoucher ----
  let full;
  try {
    full = await tv.getFullProducts();
  } catch (e) {
    return res.status(502).json({ success: false, message: 'Gagal menghubungi TokoVoucher: ' + e.message });
  }
  if (isTvIpBlocked(full)) {
    return res.status(502).json({
      success: false, code: 'tv_ip_not_allowed',
      message: 'TokoVoucher menolak: IP server belum di-whitelist ("Ip Not Allow"). Daftar produk harus diambil dari IP yang sudah diizinkan.',
    });
  }
  if (Number(full?.status) !== 1 || !full?.data) {
    return res.status(502).json({ success: false, message: 'Respons TokoVoucher tidak valid: ' + (full?.error_msg || full?.message || 'tanpa pesan') });
  }

  const d = full.data;
  const byId = list => new Map((list || []).map(x => [Number(x.id), x]));
  const cats = byId(d.category), ops = byId(d.operator), jenisMap = byId(d.jenis);
  const now = new Date().toISOString();

  // ---- 2) Klasifikasi tiap produk ----
  const candidates = []; // { group, row }
  const seen = new Set();
  const stat = { total_tv: (d.produk || []).length, skipped_no_code: 0, skipped_no_price: 0, skipped_duplicate: 0, skipped_special: 0, not_ppob: 0 };
  const specialItems = []; // contoh produk yang dilewati (kode + alasan), buat dicek di Preview
  const byGroup = {}, catSeen = {};

  for (const p of d.produk || []) {
    const cat = cats.get(Number(p.kategori_id)) || { nama: `kategori ${p.kategori_id}`, id: p.kategori_id };
    const op = ops.get(Number(p.operator_id)) || {};
    const jn = jenisMap.get(Number(p.jenis_id)) || {};
    const cs = (catSeen[cat.nama] ||= { total: 0, ppob: 0 });
    cs.total++;

    const gid = classifyProduct({ category: cat, operator: op, jenis: jn, produk: p });
    if (!gid) { stat.not_ppob++; continue; }
    cs.ppob++;

    const code = String(p.kode_produk || '').trim();
    if (!code) { stat.skipped_no_code++; continue; }
    if (seen.has(code.toLowerCase())) { stat.skipped_duplicate++; continue; }

    const g = PPOB_GROUPS[gid];
    const cost = Math.round(Number(p.price) || 0);
    const special = g.postpaid ? null : specialReason(String(p.nama || ''), cost);
    if (special) {
      stat.skipped_special++;
      if (specialItems.length < 60) specialItems.push({ code: code, name: p.nama, modal: cost, alasan: special });
      continue;
    }
    if (cost <= 0 && !g.postpaid) { stat.skipped_no_price++; continue; }
    seen.add(code.toLowerCase());

    const tvActive = Number(p.status) === 1 && Number(op.status ?? 1) === 1 && Number(jn.status ?? 1) === 1;
    const row = {
      name: p.nama,
      description: p.deskripsi || null,
      category: g.category,
      game_id: gid,
      game_name: g.name,
      publisher: op.nama || null,
      image_url: op.logo || null,
      tv_code: code,
      price: g.postpaid ? 0 : sellPrice(cost, margin),
      original_price: 0,
      is_active: g.postpaid ? false : tvActive,   // pascabayar selalu nonaktif di katalog biasa
      sort_order: 0,
      metadata: {
        source: 'tokovoucher', ppob: true, is_postpaid: !!g.postpaid,
        tv_price: cost, tv_active: tvActive, tv_product_id: p.id,
        tv_category: cat.nama, tv_operator: op.nama || null, tv_jenis: jn.nama || null,
        auto_deactivated: !tvActive && !g.postpaid,   // nonaktif karena TokoVoucher menutupnya -> aktif lagi otomatis saat dibuka
        synced_at: now,
      },
    };
    candidates.push({ gid, row, cost });
    const bg = (byGroup[gid] ||= { name: g.name, postpaid: !!g.postpaid, total: 0, active: 0, sample: [] });
    bg.total++;
    if (row.is_active) bg.active++;
    if (bg.sample.length < 3) bg.sample.push({ code, name: row.name, modal: cost, jual: row.price });
  }

  const summary = {
    margin: { percent: margin.marginPercent, flat: margin.marginFlat, round_to: margin.roundTo },
    tokovoucher: stat,
    skipped_special_items: specialItems,
    groups: byGroup,
    categories_seen: Object.entries(catSeen).map(([nama, v]) => ({ nama, ...v })).sort((a, b) => b.total - a.total),
  };

  if (preview) {
    return res.json({ success: true, mode: 'preview', message: 'Preview saja, belum ada data yang ditulis.', ...summary, to_import: candidates.length });
  }

  // ---- 3) Lihat produk yang sudah ada (berdasarkan tv_code) ----
  const existing = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from('products').select('id, tv_code, game_id, price, is_active, metadata')
      .not('tv_code', 'is', null).range(from, from + 999);
    if (error) return res.status(500).json({ success: false, message: 'Gagal membaca produk: ' + error.message });
    data.forEach(r => existing.set(String(r.tv_code).toLowerCase(), r));
    if (data.length < 1000) break;
  }

  // Urutan tampil: termurah dulu di tiap grup
  const rank = {};
  candidates.sort((a, b) => a.cost - b.cost).forEach(c => { rank[c.gid] = (rank[c.gid] || 0) + 1; c.row.sort_order = rank[c.gid] * 10; });

  const toInsert = [], toUpdate = [];
  let unchanged = 0, skippedOther = 0;
  for (const { row } of candidates) {
    const ex = existing.get(row.tv_code.toLowerCase());
    if (!ex) { toInsert.push(row); continue; }
    if (!String(ex.game_id || '').startsWith('ppob-')) { skippedOther++; continue; } // kode ini milik katalog game: jangan disentuh

    const exMeta = plainObj(ex.metadata);
    const patch = {};
    const meta = { ...exMeta, ...row.metadata, auto_deactivated: exMeta.auto_deactivated || false };
    const tvActive = row.metadata.tv_active;
    if (!tvActive && ex.is_active) { patch.is_active = false; meta.auto_deactivated = true; }          // TokoVoucher menutup produk
    if (tvActive && !ex.is_active && exMeta.auto_deactivated && !row.metadata.is_postpaid) { patch.is_active = true; meta.auto_deactivated = false; }
    if (updatePrices && !row.metadata.is_postpaid && row.price !== ex.price) patch.price = row.price;
    const metaChanged = exMeta.tv_price !== row.metadata.tv_price || exMeta.tv_active !== tvActive || exMeta.ppob !== true || meta.auto_deactivated !== !!exMeta.auto_deactivated;
    if (metaChanged) patch.metadata = meta;
    if (Object.keys(patch).length) toUpdate.push({ id: ex.id, patch }); else unchanged++;
  }

  // ---- 4) Tulis ke database ----
  const errors = [];
  let inserted = 0, updated = 0;
  for (const part of chunk(toInsert, 300)) {
    const { error } = await supabaseAdmin.from('products').insert(part);
    if (error) errors.push('insert: ' + error.message); else inserted += part.length;
  }
  for (const part of chunk(toUpdate, 25)) {
    const results = await Promise.all(part.map(u =>
      supabaseAdmin.from('products').update({ ...u.patch, updated_at: new Date().toISOString() }).eq('id', u.id)));
    results.forEach(r => { if (r.error) errors.push('update: ' + r.error.message); else updated++; });
  }

  return res.status(errors.length && !inserted && !updated ? 500 : 200).json({
    success: errors.length === 0 || inserted + updated > 0,
    mode: 'import',
    inserted, updated, unchanged, skipped_other_catalog: skippedOther,
    errors: errors.slice(0, 5),
    ...summary,
  });
}

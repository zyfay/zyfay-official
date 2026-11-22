// pages/api/admin/ppob/products.js
// Kelola produk PPOB dari tab PPOB di dashboard admin (hanya admin, cookie admin_token).
//   GET /api/admin/ppob/products?group=ppob-pulsa&q=telkomsel&page=1&limit=30&groups=1
//       -> daftar berhalaman; groups=1 ikut mengirim ringkasan per grup (jumlah total & aktif)
//   PUT /api/admin/ppob/products   body: { id, price?, is_active?, force? }
//       -> ubah harga jual / nyalakan-matikan satu produk
// Hanya menyentuh produk ber-game_id "ppob-*". Produk tagihan (pascabayar) diatur otomatis: tidak bisa diubah di sini.
import { getAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { PPOB_GROUPS } from '../../../../lib/ppob';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const plainObj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

const shape = p => {
  const m = plainObj(p.metadata);
  return {
    id: p.id, name: p.name, tv_code: p.tv_code, game_id: p.game_id, publisher: p.publisher,
    price: p.price, is_active: p.is_active,
    modal: Number(m.tv_price) || 0, tv_active: m.tv_active !== false, is_postpaid: m.is_postpaid === true,
  };
};

async function groupSummary() {
  const counts = {};
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin.from('products').select('game_id, is_active').like('game_id', 'ppob-%').range(from, from + 999);
    if (error) throw new Error(error.message);
    data.forEach(r => { const c = (counts[r.game_id] ||= { total: 0, active: 0 }); c.total++; if (r.is_active) c.active++; });
    if (data.length < 1000) break;
  }
  const order = Object.keys(PPOB_GROUPS);
  return Object.entries(counts)
    .map(([game_id, c]) => ({ game_id, name: PPOB_GROUPS[game_id]?.name || game_id, postpaid: !!PPOB_GROUPS[game_id]?.postpaid, ...c }))
    .sort((a, b) => (order.indexOf(a.game_id) + 1 || 99) - (order.indexOf(b.game_id) + 1 || 99));
}

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  // ---------- GET: daftar ----------
  if (req.method === 'GET') {
    const { group, groups } = req.query;
    if (group && !/^ppob-[a-z0-9-]{1,40}$/.test(String(group))) return res.status(400).json({ success: false, message: 'group tidak valid' });
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
    const q = String(req.query.q || '').replace(/[%,()*\\]/g, ' ').trim().slice(0, 40);
    const from = (page - 1) * limit;

    let query = supabaseAdmin
      .from('products')
      .select('id, name, tv_code, game_id, publisher, price, is_active, metadata', { count: 'exact' })
      .like('game_id', 'ppob-%')
      .order('game_id').order('sort_order').order('name')
      .range(from, from + limit - 1);
    if (group) query = query.eq('game_id', group);
    if (q) query = query.or(`name.ilike.%${q}%,tv_code.ilike.%${q}%`);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    const out = {
      success: true,
      products: (data || []).map(shape),
      pagination: { page, limit, total: count ?? data.length, pages: Math.max(1, Math.ceil((count ?? data.length) / limit)) },
    };
    if (groups === '1') {
      try { out.groups = await groupSummary(); } catch (e) { return res.status(500).json({ success: false, message: e.message }); }
    }
    return res.json(out);
  }

  // ---------- PUT: ubah satu produk ----------
  if (req.method === 'PUT') {
    const { id, price, is_active, force } = req.body || {};
    if (!UUID.test(String(id || ''))) return res.status(400).json({ success: false, message: 'id tidak valid' });
    if (price === undefined && is_active === undefined) return res.status(400).json({ success: false, message: 'Tidak ada yang diubah' });

    const { data: p } = await supabaseAdmin.from('products').select('id, name, tv_code, game_id, publisher, price, is_active, metadata').eq('id', id).maybeSingle();
    if (!p || !String(p.game_id || '').startsWith('ppob-')) return res.status(404).json({ success: false, message: 'Produk PPOB tidak ditemukan' });

    const meta = plainObj(p.metadata);
    if (meta.is_postpaid === true) {
      return res.status(400).json({ success: false, message: 'Produk tagihan diatur otomatis (nominal dari inquiry), tidak bisa diubah di sini' });
    }

    const patch = { updated_at: new Date().toISOString() };
    if (price !== undefined) {
      const n = Number(price);
      if (!Number.isInteger(n) || n <= 0 || n > 50000000) return res.status(400).json({ success: false, message: 'Harga harus bilangan bulat antara 1 dan 50.000.000' });
      const modal = Number(meta.tv_price) || 0;
      if (modal > 0 && n < modal && force !== true) {
        return res.status(400).json({ success: false, code: 'below_cost', message: `Harga jual Rp ${n.toLocaleString('id-ID')} di bawah harga modal Rp ${modal.toLocaleString('id-ID')}` });
      }
      patch.price = n;
    }
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') return res.status(400).json({ success: false, message: 'is_active harus true/false' });
      if (is_active && meta.tv_active === false) return res.status(400).json({ success: false, message: 'Produk ini sedang ditutup oleh TokoVoucher, belum bisa diaktifkan' });
      patch.is_active = is_active;
      patch.metadata = { ...meta, auto_deactivated: false }; // keputusan manual: impor ulang tidak boleh membalikkannya
    }

    const { data: updated, error } = await supabaseAdmin.from('products').update(patch).eq('id', id).select('id, name, tv_code, game_id, publisher, price, is_active, metadata').single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, product: shape(updated) });
  }

  return res.status(405).end();
}

// pages/api/app/ppob/tagihan.js
// GET /api/app/ppob/tagihan?game_id=ppob-tagihan-pln   (game_id opsional)
// Daftar produk tagihan pascabayar (PLN pasca, PDAM, BPJS, internet) buat dipilih di aplikasi.
// Produk ini sengaja nonaktif di katalog biasa (/api/app/products), jadi daftarnya lewat endpoint ini.
// product_id dari sini dipakai di POST /api/app/ppob/inquiry. Harga modal & kode produk tidak dikirim.
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { game_id } = req.query;
  if (game_id !== undefined && !/^ppob-tagihan-[a-z0-9-]{1,40}$/.test(String(game_id))) {
    return res.status(400).json({ success: false, message: 'game_id tidak valid' });
  }

  let query = supabaseAdmin
    .from('products')
    .select('id, name, game_id, game_name, publisher, image_url, sort_order, metadata')
    .like('game_id', 'ppob-tagihan-%')
    .order('sort_order');
  if (game_id) query = query.eq('game_id', game_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  const products = (data || [])
    .filter(p => p.metadata && typeof p.metadata === 'object' && p.metadata.is_postpaid === true && p.metadata.tv_active !== false)
    .map(p => ({ id: p.id, name: p.name, game_id: p.game_id, game_name: p.game_name, publisher: p.publisher, image_url: p.image_url }));

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return res.json({ success: true, products });
}

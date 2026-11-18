// pages/api/app/zyarena/[id].js
// GET /api/app/zyarena/:id  -> detail 1 produk ZyArena
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { id } = req.query;
  const { data, error } = await supabaseAdmin
    .from('shop_products')
    .select('*, product_categories(name), shop_product_images(*)')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, message: error.message });
  if (!data) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan' });

  data.shop_product_images = (data.shop_product_images || []).sort((a, b) => a.sort_order - b.sort_order);
  return res.json({ success: true, product: data });
}

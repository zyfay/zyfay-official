// pages/api/shop-products/index.js
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { category_id } = req.query;

  let query = supabaseAdmin
    .from('shop_products')
    .select('*, product_categories(name), shop_product_images(*)')
    .eq('is_active', true)
    .order('sort_order');

  if (category_id) query = query.eq('category_id', category_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  const products = (data || []).map(p => ({
    ...p,
    shop_product_images: (p.shop_product_images || []).sort((a, b) => a.sort_order - b.sort_order),
  }));

  return res.json({ success: true, products });
}

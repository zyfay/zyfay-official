// pages/api/app/zyarena/index.js
// GET /api/app/zyarena?category_id=&q=&page=1&limit=20
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { category_id, q } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
  const from = (page - 1) * limit;

  let query = supabaseAdmin
    .from('shop_products')
    .select('*, product_categories(name), shop_product_images(*)', { count: 'exact' })
    .eq('is_active', true)
    .order('sort_order')
    .range(from, from + limit - 1);

  if (category_id) query = query.eq('category_id', category_id);
  if (q?.trim()) query = query.ilike('title', `%${q.trim().replace(/[%,]/g, '')}%`);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  const products = (data || []).map(p => ({
    ...p,
    shop_product_images: (p.shop_product_images || []).sort((a, b) => a.sort_order - b.sort_order),
  }));

  return res.json({
    success: true,
    products,
    pagination: { page, limit, total: count ?? products.length, has_more: from + products.length < (count ?? 0) },
  });
}

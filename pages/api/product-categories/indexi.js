// pages/api/product-categories/index.js
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from('product_categories')
    .select('*')
    .order('sort_order');

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, categories: data });
}

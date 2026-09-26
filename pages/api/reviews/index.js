// pages/api/reviews/index.js
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*, games(name, image_url)')
    .eq('is_active', true)
    .order('sort_order');

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, reviews: data });
}

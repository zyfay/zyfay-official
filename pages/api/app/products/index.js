// pages/api/app/products/index.js
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { game_id } = req.query;

  let query = supabaseAdmin.from('products').select('*').eq('is_active', true).order('sort_order');
  query = game_id ? query.eq('game_id', game_id) : query.is('game_id', null);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, products: data });
}

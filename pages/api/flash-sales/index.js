// pages/api/flash-sales/index.js
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('flash_sales')
    .select('*, products(*)')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('ends_at', { ascending: true });

  if (error) return res.status(500).json({ success: false, message: error.message });

  const sales = (data || [])
    .filter(fs => fs.products) // buang kalau produknya udah dihapus
    .map(fs => ({
      id: fs.id,
      sale_price: fs.sale_price,
      starts_at: fs.starts_at,
      ends_at: fs.ends_at,
      product: fs.products,
    }));

  return res.json({ success: true, flash_sales: sales });
}

// pages/api/app/flash-sales/index.js
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

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
    .filter(fs => fs.products)
    .map(fs => ({
      id: fs.id, product_id: fs.product_id, sale_price: fs.sale_price,
      starts_at: fs.starts_at, ends_at: fs.ends_at, image_url: fs.image_url,
      product: fs.products,
    }));

  return res.json({ success: true, flash_sales: sales });
                 }

// pages/api/admin/flash-sales.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('flash_sales')
      .select('*, products(*)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, flash_sales: data });
  }

  if (req.method === 'POST') {
    const { product_id, sale_price, starts_at, ends_at, is_active } = req.body;
    if (!product_id || !sale_price || !starts_at || !ends_at) {
      return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }
    const { data, error } = await supabaseAdmin
      .from('flash_sales')
      .insert({
        product_id,
        sale_price: parseInt(sale_price) || 0,
        starts_at, ends_at,
        is_active: is_active !== false,
      })
      .select('*, products(*)')
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, flash_sale: data });
  }

  if (req.method === 'PUT') {
    const { id, product_id, sale_price, starts_at, ends_at, is_active } = req.body;
    const { data, error } = await supabaseAdmin
      .from('flash_sales')
      .update({
        product_id, sale_price: parseInt(sale_price) || 0,
        starts_at, ends_at, is_active,
      })
      .eq('id', id)
      .select('*, products(*)')
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, flash_sale: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('flash_sales').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

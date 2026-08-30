// pages/api/admin/orders.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { page = 1, limit = 50, status } = req.query;
    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (status) query = query.eq('order_status', status);
    const { data, error } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, orders: data });
  }

  if (req.method === 'PATCH') {
    const { id, order_status, notes } = req.body;
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ order_status, notes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, order: data });
  }

  return res.status(405).end();
}

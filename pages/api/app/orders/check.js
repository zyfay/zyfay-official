// pages/api/app/orders/check.js
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { id, email } = req.query;
  if (!id && !email) return res.status(400).json({ success: false, message: 'id atau email wajib diisi' });

  let query = supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false });
  query = id ? query.eq('id', id) : query.eq('user_email', email).limit(30);

  const { data, error } = await query;
  if (error) return res.status(500).json({ success: false, message: error.message });

  if (id) {
    const order = data?.[0];
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });
    let payment_data = null;
    if (order.notes) { try { payment_data = JSON.parse(order.notes); } catch {} }
    return res.json({ success: true, order: { ...order, payment_data } });
  }

  return res.json({ success: true, orders: data });
}

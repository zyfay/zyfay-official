// pages/api/auth/orders.js
import { getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const customer = await getUnlockedCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Belum login / PIN belum diverifikasi' });

  const { data: row } = await supabaseAdmin.from('customers').select('email').eq('id', customer.id).single();

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, product_name, game_name, order_status, product_price, created_at')
    .eq('user_email', row.email)
    .order('created_at', { ascending: false })
    .limit(10);

  return res.json({ success: true, orders: orders || [] });
}

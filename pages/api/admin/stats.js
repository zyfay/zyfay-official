// pages/api/admin/stats.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { tv } from '../../../lib/tokovoucher';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const [ordersRes, chatsRes] = await Promise.all([
    supabaseAdmin.from('orders').select('id, order_status, product_price, created_at'),
    supabaseAdmin.from('chat_sessions').select('id, status'),
  ]);

  const orders = ordersRes.data || [];
  const chats = chatsRes.data || [];

  const revenue = orders
    .filter(o => o.order_status === 'success')
    .reduce((sum, o) => sum + (o.product_price || 0), 0);

  // Today's orders
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.created_at?.startsWith(today));

  let balance = null;
  if (tv.isConfigured()) {
    try {
      const b = await tv.getBalance();
      balance = b?.data?.saldo ?? b?.saldo ?? null;
    } catch {}
  }

  return res.json({
    success: true,
    total_orders: orders.length,
    today_orders: todayOrders.length,
    success_orders: orders.filter(o => o.order_status === 'success').length,
    pending_orders: orders.filter(o => o.order_status === 'pending').length,
    revenue,
    active_chats: chats.filter(c => c.status !== 'resolved').length,
    waiting_chats: chats.filter(c => c.status === 'waiting').length,
    tv_balance: balance,
    tv_configured: tv.isConfigured(),
  });
}

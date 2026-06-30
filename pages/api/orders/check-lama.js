// pages/api/orders/check.js
import { supabaseAdmin } from '../../../lib/supabase';
import { tv } from '../../../lib/tokovoucher';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'ID required' });

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

  // Try to refresh from TokoVoucher if still processing
  if (order.order_status === 'processing' && order.ref_id && tv.isConfigured()) {
    try {
      const tvRes = await tv.checkOrder(order.ref_id);
      if (tvRes?.data?.status) {
        const newStatus = tvRes.data.status === 'Sukses' ? 'success'
          : tvRes.data.status === 'Gagal' ? 'failed' : 'processing';
        await supabaseAdmin.from('orders').update({
          order_status: newStatus,
          tv_sn: tvRes.data.sn || order.tv_sn,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        order.order_status = newStatus;
      }
    } catch (e) { console.error('TV check error:', e); }
  }

  return res.json({ success: true, order });
}

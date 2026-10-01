// pages/api/orders/cancel.js
import { supabaseAdmin } from '../../../lib/supabase';
import { pakasir } from '../../../lib/pakasir';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: 'ID pesanan wajib diisi' });

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_status, payment_status, txn_id')
    .eq('id', id)
    .single();

  if (error || !order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

  if (order.payment_status === 'paid' || order.order_status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Pesanan ini sudah tidak bisa dibatalkan' });
  }

  // Batalkan juga di sisi Pakasir (best-effort, gak boleh ngeblok pembatalan di web)
  if (pakasir.isConfigured() && order.txn_id) {
    try {
      await pakasir.cancelTransaction(order.txn_id);
    } catch (e) {
      console.error('Pakasir cancel error:', e.message);
    }
  }

  const { error: updateErr } = await supabaseAdmin
    .from('orders')
    .update({
      order_status: 'failed',
      payment_status: 'failed',
      cancel_reason: 'Dibatalkan oleh pengguna',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateErr) return res.status(500).json({ success: false, message: updateErr.message });

  return res.json({ success: true });
}

// pages/api/orders/check.js
import { supabaseAdmin } from '../../../lib/supabase';
import { tv } from '../../../lib/tokovoucher';
import { refundSaldoOrder } from '../../../lib/refund';

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
        // Update hanya kalau masih "processing" -> perubahan status cuma terjadi sekali, jadi
        // pengembalian saldo / notifikasi WA di bawah tidak terpicu berulang tiap halaman dibuka.
        const { data: changed } = await supabaseAdmin.from('orders').update({
          order_status: newStatus,
          tv_sn: tvRes.data.sn || order.tv_sn,
          updated_at: new Date().toISOString(),
        }).eq('id', id).eq('order_status', 'processing').select('id');
        order.order_status = newStatus;
        if (tvRes.data.sn) order.tv_sn = tvRes.data.sn;

        if (changed && changed.length > 0) {
          if (newStatus === 'failed') await refundSaldoOrder(id);
          if (newStatus === 'success') {
            try {
              const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
              await fetch(`${baseUrl}/api/admin/whatsapp/notify-order`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: id }),
              });
            } catch (e) { console.error('WA notify trigger error:', e.message); }
          }
        }
      }
    } catch (e) { console.error('TV check error:', e); }
  }

  // Data QR pembayaran (RonzzPay) tersimpan sebagai JSON di kolom notes
  let payment_data = null;
  if (order.notes) {
    try { payment_data = JSON.parse(order.notes); } catch {}
  }

  return res.json({ success: true, order: { ...order, payment_data } });
}

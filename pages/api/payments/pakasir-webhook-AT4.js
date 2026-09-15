// pages/api/payments/pakasir-webhook.js
import { supabaseAdmin } from '../../../lib/supabase';
import { pakasir } from '../../../lib/pakasir';
import { tv } from '../../../lib/tokovoucher';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { order_id, amount, status } = req.body || {};
  if (!order_id) return res.status(400).json({ message: 'order_id required' });

  try {
    const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', order_id).single();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Pakasir tidak mengirim signature di webhook-nya, jadi demi keamanan kita
    // re-verifikasi langsung ke API mereka sebelum mempercayai status ini —
    // mencegah webhook palsu yang di-hit manual oleh orang lain.
    let verifiedStatus = status;
    try {
      const detail = await pakasir.getTransactionDetail({ orderId: order_id, amount: amount || order.product_price });
      if (detail?.transaction?.status) verifiedStatus = detail.transaction.status;
    } catch (e) {
      console.error('Verify transaction detail failed:', e);
    }

    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    if (verifiedStatus === 'completed') {
      paymentStatus = 'paid';
      orderStatus = 'processing';
    } else if (verifiedStatus === 'expired') {
      paymentStatus = 'expired';
      orderStatus = 'expired';
    } else if (verifiedStatus === 'canceled' || verifiedStatus === 'cancelled' || verifiedStatus === 'failed') {
      paymentStatus = 'failed';
      orderStatus = 'failed';
    }

    await supabaseAdmin
      .from('orders')
      .update({ payment_status: paymentStatus, order_status: orderStatus, updated_at: new Date().toISOString() })
      .eq('id', order_id);

    // Kalau sukses dibayar, otomatis proses top up via TokoVoucher
    if (paymentStatus === 'paid' && tv.isConfigured()) {
      try {
        const { data: product } = await supabaseAdmin
          .from('products').select('tv_code').eq('id', order.product_id).single();

        if (product?.tv_code) {
          const target = order.form_data?.zone_id
            ? `${order.form_data.user_id}.${order.form_data.zone_id}`
            : order.form_data?.user_id || '';

          const tvRes = await tv.createOrder({
            kode_produk: product.tv_code,
            tujuan: target,
            ref_id: order.ref_id,
          });

          const newStatus = tvRes?.data?.status === 'Sukses' ? 'success' : 'processing';
          await supabaseAdmin
            .from('orders')
            .update({ order_status: newStatus, tv_sn: tvRes?.data?.sn, updated_at: new Date().toISOString() })
            .eq('id', order_id);
        }
      } catch (e) { console.error('TV error:', e); }
    }

    return res.json({ message: 'OK' });
  } catch (err) {
    console.error('Pakasir webhook error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

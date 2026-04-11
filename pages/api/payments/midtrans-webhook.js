// pages/api/payments/midtrans-webhook.js
import { supabaseAdmin } from '../../../lib/supabase';
import { verifySignature } from '../../../lib/midtrans';
import { tv } from '../../../lib/tokovoucher';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;
  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

  // Verify signature
  const expectedSig = verifySignature(order_id, status_code, gross_amount, process.env.MIDTRANS_SERVER_KEY);
  if (signature_key !== expectedSig) {
    return res.status(403).json({ message: 'Invalid signature' });
  }

  try {
    // Get order from Supabase
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (!order) return res.status(404).json({ message: 'Order not found' });

    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (fraud_status === 'accept' || !fraud_status) {
        paymentStatus = 'paid';
        orderStatus = 'processing';
      }
    } else if (transaction_status === 'deny' || transaction_status === 'expire' || transaction_status === 'cancel') {
      paymentStatus = transaction_status === 'expire' ? 'expired' : 'failed';
      orderStatus = 'failed';
    }

    // Update order payment status
    await supabaseAdmin
      .from('orders')
      .update({ payment_status: paymentStatus, order_status: orderStatus, updated_at: new Date().toISOString() })
      .eq('id', order_id);

    // If paid, process top up via TokoVoucher
    if (paymentStatus === 'paid' && tv.isConfigured() && order.tv_code) {
      try {
        const target = order.form_data?.zone_id
          ? `${order.form_data.user_id}.${order.form_data.zone_id}`
          : order.form_data?.user_id || '';

        const tvRes = await tv.createOrder({
          kode_produk: order.tv_code || order.product_name,
          target,
          ref_id: order.ref_id,
        });

        const newStatus = tvRes?.data?.status === 'Sukses' ? 'success' : 'processing';

        await supabaseAdmin
          .from('orders')
          .update({
            order_status: newStatus,
            tv_trx_id: tvRes?.data?.trx_id,
            tv_sn: tvRes?.data?.sn,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order_id);
      } catch (tvErr) {
        console.error('TokoVoucher error:', tvErr);
      }
    }

    return res.json({ message: 'OK' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

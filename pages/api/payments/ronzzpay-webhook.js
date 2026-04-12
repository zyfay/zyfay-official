// pages/api/payments/ronzzpay-webhook.js
import { supabaseAdmin } from '../../../lib/supabase';
import { tv } from '../../../lib/tokovoucher';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;
  console.log('RonzzPay webhook:', JSON.stringify(body));

  const { reff_id, status, amount } = body;

  // reff_id format: ZY-xxx (order ID kita)
  const orderId = reff_id;

  try {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) {
      console.error('Order not found:', orderId);
      return res.status(404).json({ message: 'Order not found' });
    }

    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    // RonzzPay status: success, pending, failed, expired
    if (status === 'success' || status === 'paid') {
      paymentStatus = 'paid';
      orderStatus = 'processing';
    } else if (status === 'failed') {
      paymentStatus = 'failed';
      orderStatus = 'failed';
    } else if (status === 'expired') {
      paymentStatus = 'expired';
      orderStatus = 'failed';
    }

    // Update order status
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: paymentStatus,
        order_status: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Auto process via TokoVoucher jika sudah dibayar
    if (paymentStatus === 'paid' && tv.isConfigured()) {
      try {
        const { data: product } = await supabaseAdmin
          .from('products')
          .select('tv_code')
          .eq('id', order.product_id)
          .single();

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
            .update({
              order_status: newStatus,
              tv_sn: tvRes?.data?.sn,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);
        }
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

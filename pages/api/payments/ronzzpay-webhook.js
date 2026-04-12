import { supabaseAdmin } from '../../../lib/supabase';
import { tv } from '../../../lib/tokovoucher';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;
  const { event, data } = body;
  const { reff_id, status, code } = data || {};

  // Cari order berdasarkan reff_id yang kita simpan
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('midtrans_token', reff_id)
    .single();

  if (!order) return res.status(404).json({ message: 'Order not found' });

  let paymentStatus = 'pending';
  let orderStatus = 'pending';

  if (event === 'transaction.success' || status === 'success') {
    paymentStatus = 'paid';
    orderStatus = 'processing';
  } else if (status === 'failed') {
    paymentStatus = 'failed';
    orderStatus = 'failed';
  } else if (status === 'expired') {
    paymentStatus = 'expired';
    orderStatus = 'failed';
  }

  await supabaseAdmin
    .from('orders')
    .update({ payment_status: paymentStatus, order_status: orderStatus, updated_at: new Date().toISOString() })
    .eq('id', order.id);

  // Auto process TokoVoucher jika paid
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
          .eq('id', order.id);
      }
    } catch (e) { console.error('TV error:', e); }
  }

  return res.json({ message: 'OK' });
}

// pages/api/payments/pakasir-webhook.js
import { supabaseAdmin } from '../../../lib/supabase';
import { pakasir } from '../../../lib/pakasir';
import { tv } from '../../../lib/tokovoucher';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // API v2: Pakasir ngirim header X-Secret. Kalau PAKASIR_WEBHOOK_SECRET udah
  // diisi di env Vercel, kita tolak request yang secret-nya gak cocok.
  const expectedSecret = process.env.PAKASIR_WEBHOOK_SECRET;
  if (expectedSecret && req.headers['x-secret'] !== expectedSecret) {
    return res.status(401).json({ message: 'Invalid secret' });
  }

  const { order_id, txn_id, status } = req.body || {};
  if (!order_id) return res.status(400).json({ message: 'order_id required' });

  try {
    const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', order_id).single();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Lapis kedua: cek ulang status asli ke Pakasir pakai txn_id
    let verifiedStatus = status;
    const txnToCheck = txn_id || order.txn_id;
    if (txnToCheck) {
      try {
        const detail = await pakasir.getTransactionStatus(txnToCheck);
        if (detail?.status) verifiedStatus = detail.status;
      } catch (e) {
        console.error('Verify transaction status failed:', e);
      }
    }

    // v2 cuma punya 3 status: pending | completed | canceled
    let paymentStatus = 'pending';
    let orderStatus = 'pending';

    if (verifiedStatus === 'completed') {
      paymentStatus = 'paid';
      orderStatus = 'processing';
    } else if (verifiedStatus === 'canceled') {
      paymentStatus = 'failed';
      orderStatus = 'failed';
    }

    // Jangan timpa pesanan yang udah selesai diproses
    if (order.order_status === 'success') {
      return res.json({ message: 'OK' });
    }

    await supabaseAdmin
      .from('orders')
      .update({ payment_status: paymentStatus, order_status: orderStatus, updated_at: new Date().toISOString() })
      .eq('id', order_id);

    // Kalau sukses dibayar, otomatis proses top up via TokoVoucher
    if (paymentStatus === 'paid' && order.payment_status !== 'paid' && tv.isConfigured()) {
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

          // Kirim notif WA (best-effort)
          if (newStatus === 'success') {
            try {
              const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
              await fetch(`${baseUrl}/api/admin/whatsapp/notify-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id }),
              });
            } catch (e) { console.error('WA notify trigger error:', e); }
          }
        }
      } catch (e) { console.error('TV error:', e); }
    }

    return res.json({ message: 'OK' });
  } catch (err) {
    console.error('Pakasir webhook error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

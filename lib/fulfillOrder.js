// lib/fulfillOrder.js
// Langkah "setelah dibayar": kirim order ke TokoVoucher, simpan hasilnya, dan kabari lewat WhatsApp.
// Isinya sama dengan yang dilakukan pakasir-webhook.js untuk pembayaran QRIS/VA.
import { supabaseAdmin } from './supabase';
import { tv } from './tokovoucher';

export async function fulfillPaidOrder(order, baseUrl) {
  if (!tv.isConfigured()) return { status: 'processing' };

  const { data: product } = await supabaseAdmin
    .from('products').select('tv_code').eq('id', order.product_id).single();
  if (!product?.tv_code) return { status: 'processing' }; // produk manual: admin yang memproses

  const target = order.form_data?.zone_id
    ? `${order.form_data.user_id}.${order.form_data.zone_id}`
    : order.form_data?.user_id || '';

  const tvRes = await tv.createOrder({ kode_produk: product.tv_code, tujuan: target, ref_id: order.ref_id });

  const status = tvRes?.data?.status === 'Sukses' ? 'success' : 'processing';
  await supabaseAdmin
    .from('orders')
    .update({ order_status: status, tv_sn: tvRes?.data?.sn || null, updated_at: new Date().toISOString() })
    .eq('id', order.id);

  if (status === 'success') {
    try {
      await fetch(`${baseUrl}/api/admin/whatsapp/notify-order`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id }),
      });
    } catch (e) { console.error('WA notify trigger error:', e.message); }
  }

  return { status };
}

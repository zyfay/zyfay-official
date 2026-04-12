// pages/api/admin/process-tv.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { tv } from '../../../lib/tokovoucher';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

  // Get order
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return res.status(404).json({ success: false, message: 'Order tidak ditemukan' });
  }

  if (!order.product_id) {
    return res.status(400).json({ success: false, message: 'Product ID kosong' });
  }

  // Get product tv_code
  const { data: product, error: prodErr } = await supabaseAdmin
    .from('products')
    .select('tv_code')
    .eq('id', order.product_id)
    .single();

  if (prodErr || !product?.tv_code) {
    return res.status(400).json({ success: false, message: 'Kode TokoVoucher kosong, update produk dulu' });
  }

  // Build tujuan & server_id
  const userId = order.form_data?.user_id || '';
  const zoneId = order.form_data?.zone_id || '';

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID kosong di form data' });
  }

  if (!tv.isConfigured()) {
    return res.status(400).json({ success: false, message: 'TokoVoucher belum dikonfigurasi' });
  }

  try {
    const tvRes = await tv.createOrder({
      kode_produk: product.tv_code,
      tujuan: userId,
      server_id: zoneId,
      ref_id: order.ref_id,
    });

    console.log('TV Response:', JSON.stringify(tvRes));

    const tvStatus = tvRes?.data?.status?.toLowerCase();
    const newStatus = tvStatus === 'sukses' ? 'success'
      : tvStatus === 'gagal' ? 'failed'
      : 'processing';

    await supabaseAdmin
      .from('orders')
      .update({
        order_status: newStatus,
        tv_sn: tvRes?.data?.sn || null,
        tv_trx_id: tvRes?.data?.trx_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return res.json({
      success: true,
      status: newStatus,
      message: tvRes?.data?.message || tvRes?.message || 'Berhasil diproses',
      tv: tvRes?.data,
    });
  } catch (err) {
    console.error('process-tv error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

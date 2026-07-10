// pages/api/orders/repay.js
import { supabaseAdmin } from '../../../lib/supabase';
import { pakasir } from '../../../lib/pakasir';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: 'ID pesanan wajib diisi' });

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

  if (order.payment_status === 'paid' || order.order_status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Pesanan ini sudah tidak bisa dibayar ulang' });
  }

  if (!pakasir.isConfigured()) {
    return res.status(500).json({ success: false, message: 'Payment gateway belum dikonfigurasi' });
  }

  try {
    const pkRes = await pakasir.createTransaction({
      method: order.payment_method || 'qris',
      orderId: order.id,
      amount: order.product_price,
    });

    if (!pkRes?.payment) {
      return res.status(500).json({ success: false, message: 'Gagal membuat ulang pembayaran' });
    }

    await supabaseAdmin
      .from('orders')
      .update({
        notes: JSON.stringify(pkRes.payment),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return res.json({ success: true, payment_data: pkRes.payment });
  } catch (e) {
    console.error('Repay error:', e);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan, coba lagi' });
  }
}

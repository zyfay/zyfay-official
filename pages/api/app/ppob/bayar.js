// pages/api/app/ppob/bayar.js
// POST /api/app/ppob/bayar   body: { inquiry_id, user_email, user_name?, customer_phone?, payment_method? }
// Bayar tagihan pascabayar dari hasil /api/app/ppob/inquiry.
// NOMINAL SELALU dari server (tabel ppob_inquiries), bukan dari klien.
// Setelah Pakasir mengabarkan "lunas", webhook yang sudah ada otomatis meneruskan ke TokoVoucher
// memakai ref_id yang SAMA dengan inquiry (itu yang diminta TokoVoucher untuk pembayaran pascabayar).
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { getAppCustomer } from '../../../../lib/appAuth';
import { pakasir } from '../../../../lib/pakasir';
import { PAYMENT_METHODS } from '../../../../lib/paymentMethods';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function paymentDataOf(order) {
  if (!order?.notes) return null;
  try { return JSON.parse(order.notes); } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { inquiry_id, user_email, user_name, customer_phone, payment_method } = req.body || {};
  if (!UUID.test(String(inquiry_id || ''))) return res.status(400).json({ success: false, message: 'inquiry_id tidak valid' });
  if (!EMAIL.test(String(user_email || ''))) return res.status(400).json({ success: false, message: 'Email tidak valid' });

  const method = payment_method || 'qris';
  if (!PAYMENT_METHODS.some(m => m.code === method)) {
    return res.status(400).json({ success: false, message: 'Metode pembayaran tidak dikenal' });
  }
  if (!pakasir.isConfigured()) return res.status(503).json({ success: false, message: 'Pembayaran belum aktif' });

  const { data: inquiry } = await supabaseAdmin.from('ppob_inquiries').select('*').eq('id', inquiry_id).maybeSingle();
  if (!inquiry) return res.status(404).json({ success: false, message: 'Tagihan tidak ditemukan, cek tagihan lagi' });

  // Sudah pernah dibuatkan pesanan untuk tagihan ini?
  if (inquiry.order_id) {
    const { data: prev } = await supabaseAdmin.from('orders').select('*').eq('id', inquiry.order_id).maybeSingle();
    if (prev && prev.payment_status === 'pending' && prev.order_status === 'pending') {
      return res.json({ success: true, duplicate: true, order: prev, payment_data: paymentDataOf(prev), amount: prev.product_price });
    }
    return res.status(409).json({ success: false, message: 'Tagihan ini sudah dibayar atau sedang diproses' });
  }
  if (new Date(inquiry.expires_at) < new Date()) {
    return res.status(410).json({ success: false, message: 'Tagihan sudah kedaluwarsa, cek tagihan lagi' });
  }

  const { data: product } = await supabaseAdmin
    .from('products').select('id, name, tv_code, game_id, game_name').eq('id', inquiry.product_id).maybeSingle();
  if (!product?.tv_code) return res.status(404).json({ success: false, message: 'Produk tagihan tidak tersedia' });

  const orderId = `ZY-${Date.now()}`;
  const amount = inquiry.total_charge;

  // "Klaim" tagihan secara atomik: dua permintaan bersamaan tidak bisa sama-sama membuat pesanan
  const { data: claimed } = await supabaseAdmin
    .from('ppob_inquiries').update({ order_id: orderId }).eq('id', inquiry.id).is('order_id', null).select('id');
  if (!claimed?.length) return res.status(409).json({ success: false, message: 'Tagihan ini sedang diproses' });

  const release = async () => {
    // lepaskan klaim; ref_id pesanan gagal diganti supaya ref_id inquiry bebas dipakai ulang
    await supabaseAdmin.from('orders')
      .update({ order_status: 'failed', payment_status: 'failed', ref_id: crypto.randomUUID(), updated_at: new Date().toISOString() })
      .eq('id', orderId);
    await supabaseAdmin.from('ppob_inquiries').update({ order_id: null }).eq('id', inquiry.id);
  };

  try {
    const me = await getAppCustomer(req).catch(() => null);
    const email = String(user_email).trim().toLowerCase();

    const { data: order, error } = await supabaseAdmin.from('orders').insert({
      id: orderId,
      ref_id: inquiry.ref_id,                  // ref_id inquiry = ref_id transaksi di TokoVoucher
      game_id: product.game_id, game_name: product.game_name,
      product_id: product.id, product_name: product.name,
      product_price: amount,
      user_email: email, user_name: (user_name || email.split('@')[0]).toString().slice(0, 60),
      customer_phone: customer_phone || null,
      customer_id: me?.id || null,
      form_data: {
        user_id: inquiry.customer_no,          // dipakai alur "setelah lunas" sebagai nomor tujuan
        ppob_inquiry_id: inquiry.id, customer_name: inquiry.customer_name, period: inquiry.period,
      },
      payment_method: method, payment_status: 'pending', order_status: 'pending',
    }).select().single();
    if (error) throw error;

    let pk;
    try {
      pk = await pakasir.createTransaction({ method, orderId, amount });
    } catch (e) {
      console.error('PPOB Pakasir error:', e.message);
    }
    if (!pk?.txn_id) {
      await release();
      return res.status(502).json({ success: false, message: 'Gagal membuat pembayaran, coba lagi sebentar' });
    }

    await supabaseAdmin.from('orders').update({ notes: JSON.stringify(pk), txn_id: pk.txn_id }).eq('id', orderId);
    return res.json({ success: true, order: { ...order, txn_id: pk.txn_id }, payment_data: pk, amount });
  } catch (err) {
    console.error('PPOB bayar error:', err);
    await release().catch(() => {});
    return res.status(500).json({ success: false, message: 'Gagal membuat pesanan' });
  }
}

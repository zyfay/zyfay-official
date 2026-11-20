// pages/api/app/orders/create.js  (GANTI file yang lama dengan ini)
// Sama seperti sebelumnya, ditambah: voucher_code (diskon dihitung server), customer_phone,
// game_nickname, dan pesanan ikut tercatat di akun kalau header Authorization: Bearer <token> dikirim.
import { supabaseAdmin } from '../../../../lib/supabase';
import { pakasir } from '../../../../lib/pakasir';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { getServerPrice } from '../../../../lib/pricing';
import { getAppCustomer } from '../../../../lib/appAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const {
    game_id, game_name, product_id, product_name,
    product_price, form_data,
    user_email, user_name,
    payment_method,
    voucher_code, customer_phone, game_nickname,
  } = req.body;

  if (!product_id || !user_email) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  const method = payment_method || 'qris';

  try {
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_email', user_email)
      .eq('product_id', product_id)
      .eq('payment_method', method)
      .eq('order_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const dup = existing[0];
      let payment_data = null;
      if (dup.notes) { try { payment_data = JSON.parse(dup.notes); } catch {} }
      return res.json({ success: true, order: dup, payment_data, duplicate: true });
    }

    // Harga SELALU dari database (produk + flash sale yang sedang berlangsung), bukan dari kiriman klien.
    const priced = await getServerPrice(product_id);
    if (!priced) {
      return res.status(400).json({ success: false, message: 'Produk tidak ditemukan atau sedang tidak tersedia' });
    }
    const serverName = priced.product.name;
    let finalPrice = priced.price;
    let discountAmount = 0;
    let appliedVoucher = null;

    // ID game dipakai sebagai kunci pemakaian voucher (sama seperti di web)
    const gameUserId = form_data?.user_id?.toString().trim() || Object.values(form_data || {})[0]?.toString().trim() || '';

    if (voucher_code?.trim()) {
      const normalizedCode = voucher_code.trim().toUpperCase().replace(/[\\%_]/g, (m) => '\\' + m);
      const { data: voucher } = await supabaseAdmin
        .from('vouchers').select('*').ilike('code', normalizedCode).limit(1).maybeSingle();

      if (voucher && voucher.is_active && new Date(voucher.expires_at) > new Date() && gameUserId) {
        const { data: usage } = await supabaseAdmin
          .from('voucher_usages').select('id')
          .eq('voucher_id', voucher.id).eq('game_user_id', gameUserId).maybeSingle();
        if (!usage) {
          discountAmount = Math.round((finalPrice * voucher.discount_percent) / 100);
          finalPrice = Math.max(0, finalPrice - discountAmount);
          appliedVoucher = voucher;
        }
      }
      // Aplikasi sudah mengecek kode sebelumnya. Kalau sekarang tidak berlaku lagi, jangan diam-diam tagih harga penuh.
      if (!appliedVoucher) {
        return res.status(400).json({ success: false, message: 'Kode voucher tidak berlaku lagi. Hapus kodenya atau coba kode lain.' });
      }
    }

    if (finalPrice < 1) {
      return res.status(400).json({ success: false, message: 'Total pembayaran tidak valid, hubungi admin.' });
    }

    const sessionCustomer = await getAppCustomer(req).catch(() => null);
    const orderId = `ZY-${Date.now()}`;

    const orderRow = {
      id: orderId,
      game_id, game_name, product_id, product_name: serverName, product_price: finalPrice,
      user_email, user_name,
      customer_phone: customer_phone || null,
      form_data: form_data || {},
      payment_method: method,
      payment_status: 'pending',
      order_status: 'pending',
      voucher_code: appliedVoucher ? appliedVoucher.code : null,
      discount_amount: discountAmount,
      game_nickname: game_nickname || null,
    };

    let { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert(sessionCustomer ? { ...orderRow, customer_id: sessionCustomer.id } : orderRow)
      .select()
      .single();

    // Kolom customer_id belum ada? Ulangi tanpa customer_id supaya pesanan tidak gagal.
    if (error && sessionCustomer && ['42703', 'PGRST204'].includes(error.code)) {
      ({ data: order, error } = await supabaseAdmin.from('orders').insert(orderRow).select().single());
    }
    if (error) throw error;

    if (appliedVoucher && gameUserId) {
      await supabaseAdmin.from('voucher_usages').insert({
        voucher_id: appliedVoucher.id,
        game_user_id: gameUserId,
        order_id: orderId,
      });
    }

    let paymentData = null;
    if (pakasir.isConfigured()) {
      try {
        const pkRes = await pakasir.createTransaction({ method, orderId, amount: finalPrice });
        if (pkRes?.txn_id) {
          paymentData = pkRes;
          await supabaseAdmin.from('orders').update({ notes: JSON.stringify(pkRes), txn_id: pkRes.txn_id }).eq('id', orderId);
        }
      } catch (pkErr) {
        console.error('Pakasir error:', pkErr.message);
      }
    }

    return res.json({ success: true, order, payment_data: paymentData, discount_amount: discountAmount });
  } catch (err) {
    console.error('App create order error:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat pesanan: ' + err.message });
  }
}

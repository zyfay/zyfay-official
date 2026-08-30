// pages/api/orders/create.js
import { supabaseAdmin } from '../../../lib/supabase';
import { pakasir } from '../../../lib/pakasir';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    game_id, game_name, product_id, product_name,
    product_price, form_data,
    user_email, user_name,
    payment_method,
    voucher_code,
    game_nickname,
  } = req.body;

  if (!product_id || !product_price || !user_email) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  const method = payment_method || 'qris';
  const gameUserId = form_data?.user_id?.toString().trim() || '';

  try {
    // Anti-spam: kalau email yang sama masih punya pesanan pending untuk
    // produk & metode pembayaran yang sama, jangan bikin pesanan baru —
    // arahkan ke yang lama.
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
      if (dup.notes) {
        try { payment_data = JSON.parse(dup.notes); } catch {}
      }
      return res.json({
        success: true,
        order: dup,
        payment_data,
        duplicate: true,
      });
    }

    // ===== Validasi & terapkan voucher di server (jangan percaya harga dari client) =====
    let finalPrice = parseInt(product_price);
    let discountAmount = 0;
    let appliedVoucher = null;

    if (voucher_code?.trim()) {
      const normalizedCode = voucher_code.trim().toUpperCase();
      const { data: voucher } = await supabaseAdmin
        .from('vouchers')
        .select('*')
        .ilike('code', normalizedCode)
        .single();

      if (voucher && voucher.is_active && new Date(voucher.expires_at) > new Date() && gameUserId) {
        const { data: usage } = await supabaseAdmin
          .from('voucher_usages')
          .select('id')
          .eq('voucher_id', voucher.id)
          .eq('game_user_id', gameUserId)
          .maybeSingle();

        if (!usage) {
          discountAmount = Math.round((finalPrice * voucher.discount_percent) / 100);
          finalPrice = Math.max(0, finalPrice - discountAmount);
          appliedVoucher = voucher;
        }
      }
    }

    const orderId = `ZY-${Date.now()}`;

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        game_id, game_name, product_id, product_name,
        product_price: finalPrice,
        user_email, user_name,
        form_data: form_data || {},
        payment_method: method,
        payment_status: 'pending',
        order_status: 'pending',
        voucher_code: appliedVoucher ? appliedVoucher.code : null,
        discount_amount: discountAmount,
        game_nickname: game_nickname || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Kunci pemakaian voucher-nya buat ID game ini
    if (appliedVoucher && gameUserId) {
      await supabaseAdmin.from('voucher_usages').insert({
        voucher_id: appliedVoucher.id,
        game_user_id: gameUserId,
        order_id: orderId,
      });
    }

    let paymentData = null;

    // Buat transaksi pembayaran via Pakasir (pakai harga FINAL setelah diskon)
    if (pakasir.isConfigured()) {
      try {
        const pkRes = await pakasir.createTransaction({ method, orderId, amount: finalPrice });

        if (pkRes?.payment) {
          paymentData = pkRes.payment;
          await supabaseAdmin
            .from('orders')
            .update({ notes: JSON.stringify(pkRes.payment) })
            .eq('id', orderId);
        } else {
          console.error('Pakasir create error:', pkRes);
        }
      } catch (pkErr) {
        console.error('Pakasir error:', pkErr.message);
      }
    }

    return res.json({
      success: true,
      order,
      payment_data: paymentData,
      discount_amount: discountAmount,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat pesanan: ' + err.message });
  }
}

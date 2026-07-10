// pages/api/orders/create.js
import { supabaseAdmin } from '../../../lib/supabase';
import { pakasir } from '../../../lib/pakasir';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    game_id, game_name, product_id, product_name,
    product_price, tv_code, form_data,
    user_email, user_name, user_phone,
    payment_method, // qris, bni_va, bri_va, dst — lihat lib/paymentMethods.js
  } = req.body;

  if (!product_id || !product_price || !user_email) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  const method = payment_method || 'qris';

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

    const orderId = `ZY-${Date.now()}`;

    // Save order to Supabase
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        game_id, game_name, product_id, product_name, product_price,
        user_email, user_name,
        form_data: form_data || {},
        payment_method: method,
        payment_status: 'pending',
        order_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    let paymentData = null;

    // Buat transaksi pembayaran via Pakasir
    if (pakasir.isConfigured()) {
      try {
        const pkRes = await pakasir.createTransaction({ method, orderId, amount: product_price });

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
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat pesanan: ' + err.message });
  }
}

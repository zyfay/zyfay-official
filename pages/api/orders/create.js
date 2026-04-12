// pages/api/orders/create.js
import { supabaseAdmin } from '../../../lib/supabase';
import { createTransaction, isConfigured } from '../../../lib/ronzzpay';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    game_id, game_name, product_id, product_name,
    product_price, tv_code, form_data,
    user_email, user_name, user_phone,
    payment_code // qris, dana, gopay, ovo, dll
  } = req.body;

  if (!product_id || !product_price || !user_email) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  try {
    const orderId = `ZY-${Date.now()}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zyfay-official.vercel.app';

    // Save order to Supabase
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        game_id, game_name, product_id, product_name, product_price,
        user_email, user_name,
        form_data: form_data || {},
        payment_method: payment_code || 'qris',
        payment_status: 'pending',
        order_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    let paymentData = null;

    // Create RonzzPay transaction
    if (isConfigured()) {
      try {
        const ronzzRes = await createTransaction({
          code: payment_code || 'qris',
          amount: product_price,
          description: `${orderId} - ${product_name} - ${game_name}`,
        });

        if (ronzzRes?.status === true && ronzzRes?.data) {
          paymentData = ronzzRes.data;

          // Update order with reff_id
          await supabaseAdmin
            .from('orders')
            .update({
              midtrans_token: ronzzRes.data.reff_id,
              notes: JSON.stringify(ronzzRes.data),
            })
            .eq('id', orderId);
        }
      } catch (pgErr) {
        console.error('RonzzPay error:', pgErr.message);
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

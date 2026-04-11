// pages/api/orders/create.js
import { supabaseAdmin } from '../../../lib/supabase';
import { createTransaction } from '../../../lib/midtrans';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { game_id, game_name, product_id, product_name, product_price, tv_code, form_data, user_email, user_name } = req.body;

  if (!product_id || !product_price || !user_email) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  try {
    const orderId = `ZY-${Date.now()}`;

    // Save order to Supabase
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        game_id,
        game_name,
        product_id,
        product_name,
        product_price,
        user_email,
        user_name,
        form_data,
        payment_status: 'pending',
        order_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Create Midtrans Snap token
    let snapToken = null;
    let snapUrl = null;

    const isMidtransConfigured = !!(process.env.MIDTRANS_SERVER_KEY && process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY);

    if (isMidtransConfigured) {
      try {
        const snap = await createTransaction({
          id: orderId,
          amount: product_price,
          product_id,
          product_name,
          user_name,
          user_email,
        });
        snapToken = snap.token;
        snapUrl = snap.redirect_url;

        // Update order with snap token
        await supabaseAdmin
          .from('orders')
          .update({ midtrans_token: snapToken, midtrans_url: snapUrl })
          .eq('id', orderId);
      } catch (midErr) {
        console.error('Midtrans error:', midErr.message);
        // Don't fail - return order without snap token
      }
    }

    return res.json({
      success: true,
      order,
      snap_token: snapToken,
      snap_url: snapUrl,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat pesanan: ' + err.message });
  }
}

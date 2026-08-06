// pages/api/app/orders/create.js
import { supabaseAdmin } from '../../../../lib/supabase';
import { pakasir } from '../../../../lib/pakasir';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const {
    game_id, game_name, product_id, product_name,
    product_price, form_data,
    user_email, user_name,
    payment_method,
  } = req.body;

  if (!product_id || !product_price || !user_email) {
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

    const orderId = `ZY-${Date.now()}`;

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
    if (pakasir.isConfigured()) {
      try {
        const pkRes = await pakasir.createTransaction({ method, orderId, amount: product_price });
        if (pkRes?.payment) {
          paymentData = pkRes.payment;
          await supabaseAdmin.from('orders').update({ notes: JSON.stringify(pkRes.payment) }).eq('id', orderId);
        }
      } catch (pkErr) {
        console.error('Pakasir error:', pkErr.message);
      }
    }

    return res.json({ success: true, order, payment_data: paymentData });
  } catch (err) {
    console.error('App create order error:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat pesanan: ' + err.message });
  }
}

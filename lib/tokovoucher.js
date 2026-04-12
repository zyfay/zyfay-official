// pages/api/payments/tokovoucher-webhook.js
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  // TokoVoucher kirim via GET atau POST
  const body = req.method === 'GET' ? req.query : req.body;

  console.log('TV Webhook received:', req.method, JSON.stringify(body));

  const { ref_id, status, sn, trx_id, harga } = body;

  if (!ref_id) return res.status(400).json({ message: 'ref_id required' });

  try {
    // status dari TV: sukses, gagal, pending
    const statusLower = (status || '').toLowerCase();
    const newStatus = statusLower === 'sukses' ? 'success'
      : statusLower === 'gagal' ? 'failed'
      : 'processing';

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        order_status: newStatus,
        tv_sn: sn || null,
        tv_trx_id: trx_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('ref_id', ref_id)
      .select();

    console.log('TV Webhook update result:', newStatus, data, error);

    return res.status(200).send('SUKSES');
  } catch (err) {
    console.error('TV webhook error:', err);
    return res.status(500).send('ERROR');
  }
      }

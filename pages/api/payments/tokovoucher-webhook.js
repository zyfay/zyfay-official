import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const body = req.method === 'GET' ? req.query : req.body;
  console.log('TV Webhook:', req.method, JSON.stringify(body));

  const { ref_id, status, sn, trx_id } = body;
  if (!ref_id) return res.status(400).send('ERROR');

  try {
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
      .eq('ref_id', ref_id);

    console.log('Updated:', newStatus, data, error);
    return res.status(200).send('SUKSES');
  } catch (err) {
    console.error(err);
    return res.status(500).send('ERROR');
  }
}

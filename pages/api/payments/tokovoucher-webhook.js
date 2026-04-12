import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;
  console.log('TV Webhook:', JSON.stringify(body));

  // TokoVoucher kirim: trx_id, ref_id, status, sn, dll
  const { ref_id, status, sn } = body;

  if (!ref_id) return res.status(400).json({ message: 'ref_id required' });

  try {
    const newStatus = status === 'Sukses' ? 'success' : status === 'Gagal' ? 'failed' : 'processing';

    await supabaseAdmin
      .from('orders')
      .update({
        order_status: newStatus,
        tv_sn: sn || null,
        updated_at: new Date().toISOString(),
      })
      .eq('ref_id', ref_id);

    return res.json({ message: 'OK' });
  } catch (err) {
    console.error('TV webhook error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

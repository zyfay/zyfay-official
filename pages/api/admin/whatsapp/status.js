// pages/api/admin/whatsapp/status.js
import { getAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { disconnectBot } from '../../../../lib/whatsappBot';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data } = await supabaseAdmin.from('whatsapp_bot').select('*').eq('id', 1).single();
    return res.json({ success: true, bot: data });
  }

  if (req.method === 'DELETE') {
    await disconnectBot();
    return res.json({ success: true });
  }

  return res.status(405).end();
}

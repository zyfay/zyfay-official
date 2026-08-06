// pages/api/app/notifications/index.js
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, notifications: data });
}

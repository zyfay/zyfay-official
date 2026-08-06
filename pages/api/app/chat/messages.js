// pages/api/app/chat/messages.js
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ success: false, message: 'session_id wajib diisi' });

  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, messages: data });
}

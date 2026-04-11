// pages/api/admin/chats.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { session_id } = req.query;

    if (session_id) {
      // Get messages for a specific session
      const { data } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true });
      return res.json({ success: true, messages: data || [] });
    }

    // Get all sessions
    const { data } = await supabaseAdmin
      .from('chat_sessions')
      .select('*')
      .order('last_message_at', { ascending: false });
    return res.json({ success: true, sessions: data || [] });
  }

  // POST - admin sends message
  if (req.method === 'POST') {
    const { session_id, text } = req.body;
    if (!session_id || !text) return res.status(400).json({ success: false, message: 'session_id and text required' });

    const { data: msg, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({ session_id, sender: 'admin', text })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });

    // Update session
    await supabaseAdmin
      .from('chat_sessions')
      .update({ last_message: text, last_message_at: new Date().toISOString(), status: 'active' })
      .eq('id', session_id);

    return res.json({ success: true, message: msg });
  }

  // PATCH - update session status
  if (req.method === 'PATCH') {
    const { session_id, status } = req.body;
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .update({ status })
      .eq('id', session_id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

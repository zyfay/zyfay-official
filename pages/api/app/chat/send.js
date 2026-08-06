// pages/api/app/chat/send.js
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { session_id, text, message_type, media_url } = req.body || {};
  if (!session_id || (!text && !media_url)) {
    return res.status(400).json({ success: false, message: 'session_id dan text/media_url wajib diisi' });
  }

  const { data: msg, error } = await supabaseAdmin
    .from('chat_messages')
    .insert({
      session_id,
      sender: 'user',
      text: text || '',
      message_type: message_type || 'text',
      media_url: media_url || null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  const preview = message_type === 'image' ? '📷 Gambar' : message_type === 'audio' ? '🎤 Pesan suara' : text;

  await supabaseAdmin.from('chat_sessions').update({
    last_message: preview,
    last_message_at: new Date().toISOString(),
    status: 'waiting',
  }).eq('id', session_id);

  return res.json({ success: true, message: msg });
}

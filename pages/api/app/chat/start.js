// pages/api/app/chat/start.js
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { name, session_id } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ success: false, message: 'Nama wajib diisi' });

  const sessionId = session_id || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  await supabaseAdmin.from('chat_sessions').upsert({
    id: sessionId,
    user_name: name,
    status: 'waiting',
    last_message: 'Sesi chat dimulai',
    last_message_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  await supabaseAdmin.from('chat_messages').insert({
    session_id: sessionId,
    sender: 'admin',
    text: `Halo ${name}! Selamat datang di ${siteName} Support. Ada yang bisa kami bantu? 👋`,
    message_type: 'text',
  });

  return res.json({ success: true, session_id: sessionId });
}

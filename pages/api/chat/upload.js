// pages/api/chat/upload.js
import { supabaseAdmin } from '../../../lib/supabase';

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { file_base64, file_name, kind } = req.body; // kind: 'image' | 'audio'
  if (!file_base64 || !file_name) {
    return res.status(400).json({ success: false, message: 'File tidak lengkap' });
  }

  try {
    const matches = file_base64.match(/^data:(.+);base64,(.+)$/);
    const contentType = matches ? matches[1] : (kind === 'audio' ? 'audio/webm' : 'image/jpeg');
    const base64Data = matches ? matches[2] : file_base64;
    const buffer = Buffer.from(base64Data, 'base64');

    const ext = file_name.split('.').pop() || (kind === 'audio' ? 'webm' : 'jpg');
    const folder = kind === 'audio' ? 'chat-audio' : 'chat-images';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('images')
      .upload(fileName, buffer, { contentType });

    if (uploadErr) return res.status(500).json({ success: false, message: uploadErr.message });

    const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
    return res.json({ success: true, url: urlData.publicUrl });
  } catch (e) {
    console.error('Chat upload error:', e);
    return res.status(500).json({ success: false, message: 'Gagal mengupload file' });
  }
}

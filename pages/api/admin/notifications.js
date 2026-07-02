// pages/api/admin/notifications.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, notifications: data });
  }

  if (req.method === 'POST') {
    const { title, message, type } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Judul wajib diisi' });
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({ title, message: message || '', type: type || 'info' })
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, notification: data });
  }

  if (req.method === 'PUT') {
    const { id, is_active } = req.body;
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, notification: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('notifications').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

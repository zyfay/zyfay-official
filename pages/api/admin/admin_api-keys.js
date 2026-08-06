// pages/api/admin/api-keys.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import crypto from 'crypto';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('api_keys').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, keys: data });
  }

  if (req.method === 'POST') {
    const { label } = req.body;
    if (!label?.trim()) return res.status(400).json({ success: false, message: 'Nama/label wajib diisi' });

    const key = 'zyfay_' + crypto.randomBytes(24).toString('hex');

    const { data, error } = await supabaseAdmin
      .from('api_keys')
      .insert({ label: label.trim(), key })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, key: data });
  }

  if (req.method === 'PUT') {
    const { id, is_active } = req.body;
    const { error } = await supabaseAdmin.from('api_keys').update({ is_active }).eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('api_keys').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

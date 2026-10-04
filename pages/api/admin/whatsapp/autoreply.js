// pages/api/admin/whatsapp/autoreply.js
import { getAdmin } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_autoreply')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, rules: data });
  }

  if (req.method === 'POST') {
    const { keyword, match_type, reply } = req.body || {};
    if (!keyword?.trim() || !reply?.trim()) {
      return res.status(400).json({ success: false, message: 'Keyword & balasan wajib diisi' });
    }
    const { data, error } = await supabaseAdmin
      .from('whatsapp_autoreply')
      .insert({
        keyword: keyword.trim().toLowerCase(),
        match_type: match_type === 'contains' ? 'contains' : 'exact',
        reply: reply.trim(),
      })
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, rule: data });
  }

  if (req.method === 'PATCH') {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ success: false, message: 'id wajib diisi' });
    if (fields.keyword) fields.keyword = fields.keyword.trim().toLowerCase();
    fields.updated_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from('whatsapp_autoreply').update(fields).eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'id wajib diisi' });
    const { error } = await supabaseAdmin.from('whatsapp_autoreply').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

// pages/api/admin/sponsors.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

async function uploadImage(image_base64, image_name) {
  if (!image_base64 || !image_name) return null;
  try {
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = image_name.split('.').pop() || 'jpg';
    const fileName = `sponsors/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('images')
      .upload(fileName, buffer, { contentType: `image/${ext}` });

    if (uploadErr) return null;
    const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) {
    console.error('Sponsor image upload error:', e);
    return null;
  }
}

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('sponsors').select('*').order('sort_order');
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, sponsors: data });
  }

  if (req.method === 'POST') {
    const { title, description, link_url, is_active, sort_order, image_base64, image_name } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Judul wajib diisi' });

    const image_url = await uploadImage(image_base64, image_name); // opsional, null kalau gak ada foto

    const { data, error } = await supabaseAdmin
      .from('sponsors')
      .insert({
        title: title.trim(),
        description: description || '',
        link_url: link_url || null,
        image_url,
        is_active: is_active !== false,
        sort_order: parseInt(sort_order) || 0,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, sponsor: data });
  }

  if (req.method === 'PUT') {
    const { id, image_base64, image_name, ...updates } = req.body;

    let image_url = updates.image_url;
    const uploaded = await uploadImage(image_base64, image_name);
    if (uploaded) image_url = uploaded;

    const { data, error } = await supabaseAdmin
      .from('sponsors')
      .update({ ...updates, image_url, sort_order: parseInt(updates.sort_order) || 0 })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, sponsor: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('sponsors').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

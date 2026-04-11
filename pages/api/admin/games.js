// pages/api/admin/games.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data } = await supabaseAdmin.from('games').select('*').order('sort_order');
    return res.json({ success: true, games: data || [] });
  }

  if (req.method === 'POST') {
    const { id, name, publisher, category, is_trending, is_active, sort_order, fields, image_base64, image_name } = req.body;
    let image_url = null;

    if (image_base64 && image_name) {
      try {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = image_name.split('.').pop() || 'jpg';
        const fileName = `games/${id || Date.now()}.${ext}`;
        await supabaseAdmin.storage.from('images').upload(fileName, buffer, { contentType: `image/${ext}`, upsert: true });
        const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
        image_url = urlData.publicUrl;
      } catch (e) { console.error(e); }
    }

    const { data, error } = await supabaseAdmin.from('games')
      .upsert({ id, name, publisher, category, is_trending, is_active, sort_order, fields, image_url })
      .select().single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, game: data });
  }

  if (req.method === 'PUT') {
    const { id, image_base64, image_name, ...updates } = req.body;
    let image_url = updates.image_url;

    if (image_base64 && image_name) {
      try {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = image_name.split('.').pop() || 'jpg';
        const fileName = `games/${id}.${ext}`;
        await supabaseAdmin.storage.from('images').upload(fileName, buffer, { contentType: `image/${ext}`, upsert: true });
        const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
        image_url = urlData.publicUrl;
      } catch (e) { console.error(e); }
    }

    const { data, error } = await supabaseAdmin.from('games')
      .update({ ...updates, image_url }).eq('id', id).select().single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, game: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await supabaseAdmin.from('products').update({ is_active: false }).eq('game_id', id);
    const { error } = await supabaseAdmin.from('games').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

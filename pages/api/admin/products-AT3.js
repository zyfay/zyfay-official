// pages/api/admin/products.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  // GET - list products
  if (req.method === 'GET') {
    const { game_id } = req.query;
    let q = supabaseAdmin.from('products').select('*').order('sort_order');
    if (game_id) q = q.eq('game_id', game_id);
    const { data, error } = await q;
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, products: data });
  }

  // POST - create product
  if (req.method === 'POST') {
    const { name, description, category, game_id, game_name, publisher, tv_code,
            price, original_price, is_active, sort_order, metadata, image_base64, image_name } = req.body;

    let image_url = null;

    // Upload image to Supabase Storage if provided
    if (image_base64 && image_name) {
      try {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = image_name.split('.').pop() || 'jpg';
        const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from('images')
          .upload(fileName, buffer, { contentType: `image/${ext}`, upsert: false });

        if (!uploadErr) {
          const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
          image_url = urlData.publicUrl;
        }
      } catch (imgErr) {
        console.error('Image upload error:', imgErr);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name, description, category: category || 'topup', game_id, game_name, publisher,
        tv_code, price: parseInt(price) || 0, original_price: parseInt(original_price) || 0,
        is_active: is_active !== false, sort_order: parseInt(sort_order) || 0,
        metadata: metadata || {}, image_url,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, product: data });
  }

  // PUT - update product
  if (req.method === 'PUT') {
    const { id, image_base64, image_name, ...updates } = req.body;

    let image_url = updates.image_url;

    if (image_base64 && image_name) {
      try {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const ext = image_name.split('.').pop() || 'jpg';
        const fileName = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadErr } = await supabaseAdmin.storage
          .from('images')
          .upload(fileName, buffer, { contentType: `image/${ext}` });

        if (!uploadErr) {
          const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
          image_url = urlData.publicUrl;
        }
      } catch (imgErr) {
        console.error('Image upload error:', imgErr);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...updates, image_url, price: parseInt(updates.price) || 0,
        original_price: parseInt(updates.original_price) || 0,
        sort_order: parseInt(updates.sort_order) || 0,
        updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, product: data });
  }

  // DELETE - delete product
  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

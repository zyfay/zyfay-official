// pages/api/admin/flash-sales.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

async function uploadImage(image_base64, image_name) {
  if (!image_base64 || !image_name) return null;
  try {
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const ext = image_name.split('.').pop() || 'jpg';
    const fileName = `flash-sales/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('images')
      .upload(fileName, buffer, { contentType: `image/${ext}` });

    if (uploadErr) return null;
    const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch (e) {
    console.error('Image upload error:', e);
    return null;
  }
}

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('flash_sales')
      .select('*, products(*)')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, flash_sales: data });
  }

  if (req.method === 'POST') {
    const { product_id, sale_price, starts_at, ends_at, is_active, image_base64, image_name } = req.body;
    if (!product_id || !sale_price || !starts_at || !ends_at) {
      return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }

    const image_url = await uploadImage(image_base64, image_name);

    const { data, error } = await supabaseAdmin
      .from('flash_sales')
      .insert({
        product_id,
        sale_price: parseInt(sale_price) || 0,
        starts_at, ends_at,
        is_active: is_active !== false,
        image_url,
      })
      .select('*, products(*)')
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, flash_sale: data });
  }

  if (req.method === 'PUT') {
    const { id, product_id, sale_price, starts_at, ends_at, is_active, image_base64, image_name, image_url: existingUrl } = req.body;

    let image_url = existingUrl;
    const uploaded = await uploadImage(image_base64, image_name);
    if (uploaded) image_url = uploaded;

    const { data, error } = await supabaseAdmin
      .from('flash_sales')
      .update({
        product_id, sale_price: parseInt(sale_price) || 0,
        starts_at, ends_at, is_active, image_url,
      })
      .eq('id', id)
      .select('*, products(*)')
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, flash_sale: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('flash_sales').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

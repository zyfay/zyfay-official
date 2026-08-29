// pages/api/admin/shop-product-images.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'POST') {
    const { product_id, image_base64, image_name, sort_order } = req.body;
    if (!product_id || !image_base64) {
      return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
    }

    try {
      const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = (image_name || 'jpg').split('.').pop() || 'jpg';
      const fileName = `shop-products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from('images')
        .upload(fileName, buffer, { contentType: `image/${ext}` });
      if (uploadErr) return res.status(500).json({ success: false, message: uploadErr.message });

      const { data: urlData } = supabaseAdmin.storage.from('images').getPublicUrl(fileName);

      const { data, error } = await supabaseAdmin
        .from('shop_product_images')
        .insert({ product_id, image_url: urlData.publicUrl, sort_order: sort_order || 0 })
        .select()
        .single();

      if (error) return res.status(500).json({ success: false, message: error.message });
      return res.json({ success: true, image: data });
    } catch (e) {
      console.error('Shop product image upload error:', e);
      return res.status(500).json({ success: false, message: 'Gagal upload foto' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('shop_product_images').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

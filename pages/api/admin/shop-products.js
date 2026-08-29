// pages/api/admin/shop-products.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('shop_products')
      .select('*, product_categories(name), shop_product_images(*)')
      .order('sort_order');
    if (error) return res.status(500).json({ success: false, message: error.message });

    const products = (data || []).map(p => ({
      ...p,
      shop_product_images: (p.shop_product_images || []).sort((a, b) => a.sort_order - b.sort_order),
    }));
    return res.json({ success: true, products });
  }

  if (req.method === 'POST') {
    const { title, description, price, category_id, is_active, sort_order } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Judul wajib diisi' });

    const { data, error } = await supabaseAdmin
      .from('shop_products')
      .insert({
        title: title.trim(),
        description: description || '',
        price: parseInt(price) || 0,
        category_id: category_id || null,
        is_active: is_active !== false,
        sort_order: parseInt(sort_order) || 0,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, product: { ...data, shop_product_images: [] } });
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    const { data, error } = await supabaseAdmin
      .from('shop_products')
      .update({
        title: updates.title, description: updates.description,
        price: parseInt(updates.price) || 0, category_id: updates.category_id || null,
        is_active: updates.is_active, sort_order: parseInt(updates.sort_order) || 0,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, product: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('shop_products').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

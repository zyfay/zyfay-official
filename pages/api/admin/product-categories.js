// pages/api/admin/product-categories.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('product_categories').select('*').order('sort_order');
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, categories: data });
  }

  if (req.method === 'POST') {
    const { name, sort_order } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Nama kategori wajib diisi' });

    const { data, error } = await supabaseAdmin
      .from('product_categories')
      .insert({ name: name.trim(), sort_order: parseInt(sort_order) || 0 })
      .select()
      .single();

    if (error) {
      const msg = error.code === '23505' ? 'Kategori dengan nama ini sudah ada' : error.message;
      return res.status(400).json({ success: false, message: msg });
    }
    return res.json({ success: true, category: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    // Produk yang pakai kategori ini otomatis jadi "Tanpa Kategori" (shop_category_id null)
    // berkat ON DELETE SET NULL di database, jadi aman dihapus kapan aja.
    const { error } = await supabaseAdmin.from('product_categories').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

// pages/api/admin/reviews.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, games(name)')
      .order('sort_order');
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, reviews: data });
  }

  if (req.method === 'POST') {
    const { game_id, reviewer_name, rating, comment, is_active, sort_order } = req.body;
    if (!reviewer_name?.trim() || !comment?.trim()) {
      return res.status(400).json({ success: false, message: 'Nama & komentar wajib diisi' });
    }
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        game_id: game_id || null,
        reviewer_name: reviewer_name.trim(),
        rating: parseInt(rating) || 5,
        comment: comment.trim(),
        is_active: is_active !== false,
        sort_order: parseInt(sort_order) || 0,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, review: data });
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .update({
        game_id: updates.game_id || null,
        reviewer_name: updates.reviewer_name,
        rating: parseInt(updates.rating) || 5,
        comment: updates.comment,
        is_active: updates.is_active,
        sort_order: parseInt(updates.sort_order) || 0,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true, review: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('reviews').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

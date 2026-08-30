// pages/api/admin/vouchers.js
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data: vouchers, error } = await supabaseAdmin.from('vouchers').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });

    const { data: usages } = await supabaseAdmin.from('voucher_usages').select('voucher_id');
    const usageCounts = {};
    (usages || []).forEach(u => { usageCounts[u.voucher_id] = (usageCounts[u.voucher_id] || 0) + 1; });

    const result = vouchers.map(v => ({ ...v, usage_count: usageCounts[v.id] || 0 }));
    return res.json({ success: true, vouchers: result });
  }

  if (req.method === 'POST') {
    const { code, discount_percent, valid_days } = req.body;
    if (!code?.trim()) return res.status(400).json({ success: false, message: 'Kode voucher wajib diisi' });
    if (!discount_percent || discount_percent < 1 || discount_percent > 100) {
      return res.status(400).json({ success: false, message: 'Persentase diskon harus 1-100' });
    }

    const expires_at = new Date(Date.now() + (parseInt(valid_days) || 1) * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('vouchers')
      .insert({
        code: code.trim().toUpperCase(),
        discount_percent: parseInt(discount_percent),
        expires_at,
      })
      .select()
      .single();

    if (error) {
      const msg = error.code === '23505' ? 'Kode voucher ini sudah dipakai' : error.message;
      return res.status(400).json({ success: false, message: msg });
    }
    return res.json({ success: true, voucher: data });
  }

  if (req.method === 'PUT') {
    const { id, code, discount_percent, valid_days, is_active } = req.body;
    const updates = { is_active };
    if (code) updates.code = code.trim().toUpperCase();
    if (discount_percent) updates.discount_percent = parseInt(discount_percent);
    if (valid_days) updates.expires_at = new Date(Date.now() + parseInt(valid_days) * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin.from('vouchers').update(updates).eq('id', id).select().single();
    if (error) {
      const msg = error.code === '23505' ? 'Kode voucher ini sudah dipakai' : error.message;
      return res.status(400).json({ success: false, message: msg });
    }
    return res.json({ success: true, voucher: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabaseAdmin.from('vouchers').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.json({ success: true });
  }

  return res.status(405).end();
}

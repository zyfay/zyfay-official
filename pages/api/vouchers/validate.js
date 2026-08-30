// pages/api/vouchers/validate.js
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, game_user_id, amount } = req.body || {};
  if (!code?.trim() || !game_user_id?.trim() || !amount) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  const normalizedCode = code.trim().toUpperCase();

  const { data: voucher, error } = await supabaseAdmin
    .from('vouchers')
    .select('*')
    .ilike('code', normalizedCode)
    .single();

  if (error || !voucher) {
    return res.json({ success: false, message: 'Kode voucher tidak ditemukan' });
  }
  if (!voucher.is_active) {
    return res.json({ success: false, message: 'Voucher ini sudah tidak aktif' });
  }
  if (new Date(voucher.expires_at) < new Date()) {
    return res.json({ success: false, message: 'Voucher ini sudah kedaluwarsa' });
  }

  const { data: usage } = await supabaseAdmin
    .from('voucher_usages')
    .select('id')
    .eq('voucher_id', voucher.id)
    .eq('game_user_id', game_user_id.trim())
    .maybeSingle();

  if (usage) {
    return res.json({ success: false, message: 'Voucher ini sudah pernah dipakai di ID game ini' });
  }

  const discount_amount = Math.round((amount * voucher.discount_percent) / 100);
  const final_amount = Math.max(0, amount - discount_amount);

  return res.json({
    success: true,
    code: voucher.code,
    discount_percent: voucher.discount_percent,
    discount_amount,
    final_amount,
  });
}

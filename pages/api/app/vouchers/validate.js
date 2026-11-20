// pages/api/app/vouchers/validate.js
// POST /api/app/vouchers/validate
// header: x-api-key
// body: { code, game_user_id, product_id }   (harga dihitung server dari product_id, bukan dari kiriman aplikasi)
// balikan: { success, status, message, code?, discount_percent?, discount_amount?, final_amount? }
// status: valid | not_found | inactive | expired | used
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { getServerPrice } from '../../../../lib/pricing';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { code, game_user_id, product_id } = req.body || {};
  if (!code?.trim() || !game_user_id?.toString().trim() || !product_id) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  const normalizedCode = code.trim().toUpperCase();
  // escape karakter wildcard supaya "%" / "_" yang diketik tidak dianggap pola
  const safeCode = normalizedCode.replace(/[\\%_]/g, (m) => '\\' + m);

  const { data: voucher } = await supabaseAdmin
    .from('vouchers')
    .select('*')
    .ilike('code', safeCode)
    .limit(1)
    .maybeSingle();

  if (!voucher) {
    return res.json({ success: false, status: 'not_found', message: 'Kode voucher tidak ditemukan. Mungkin kamu typo, coba cek lagi.' });
  }
  if (!voucher.is_active) {
    return res.json({ success: false, status: 'inactive', message: 'Voucher ini sudah tidak aktif.' });
  }
  if (new Date(voucher.expires_at) < new Date()) {
    return res.json({ success: false, status: 'expired', message: 'Voucher ini sudah kedaluwarsa.' });
  }

  const { data: usage } = await supabaseAdmin
    .from('voucher_usages')
    .select('id')
    .eq('voucher_id', voucher.id)
    .eq('game_user_id', game_user_id.toString().trim())
    .maybeSingle();

  if (usage) {
    return res.json({ success: false, status: 'used', message: 'Voucher ini sudah pernah dipakai di ID game ini.' });
  }

  const priced = await getServerPrice(product_id);
  if (!priced) {
    return res.status(400).json({ success: false, message: 'Produk tidak ditemukan atau sedang tidak tersedia' });
  }

  const discount_amount = Math.round((priced.price * voucher.discount_percent) / 100);
  const final_amount = Math.max(0, priced.price - discount_amount);

  return res.json({
    success: true,
    status: 'valid',
    code: voucher.code,
    discount_percent: voucher.discount_percent,
    discount_amount,
    final_amount,
  });
}

// POST /api/app/auth/verify-login
// body: { phone, code } -> balikin token JWT (30 hari)
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { verifyOtp, normalizePhone } from '../../../../lib/otp';
import { signCustomerToken } from '../../../../lib/customerAuth';
import { DEFAULT_AVATAR } from '../../../../lib/akunConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ success: false, message: 'Nomor HP & kode OTP wajib diisi' });

  const payload = await verifyOtp(normalizePhone(phone), 'login', String(code));
  if (!payload) return res.status(400).json({ success: false, message: 'Kode OTP salah atau sudah kedaluwarsa' });

  const { data: c } = await supabaseAdmin
    .from('customers').select('id, name, email, avatar, pin_hash').eq('id', payload.customerId).single();
  if (!c) return res.status(400).json({ success: false, message: 'Akun tidak ditemukan' });

  const token = await signCustomerToken({ id: c.id, name: c.name, email: c.email, role: 'customer' });
  return res.json({
    success: true, token, hasPin: !!c.pin_hash,
    user: { id: c.id, name: c.name, email: c.email, avatar: c.avatar || DEFAULT_AVATAR },
  });
}

// pages/api/auth/verify-register.js
import { supabaseAdmin } from '../../../lib/supabase';
import { verifyOtp, normalizePhone } from '../../../lib/otp';
import { signCustomerToken } from '../../../lib/customerAuth';
import { buildCookie } from '../../../lib/cookieHelper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ success: false, message: 'Nomor HP & kode OTP wajib diisi' });

  const payload = await verifyOtp(normalizePhone(phone), 'register', code);
  if (!payload) return res.status(400).json({ success: false, message: 'Kode OTP salah atau sudah kedaluwarsa' });

  const referralCode = (payload.name || 'ZY').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .insert({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      password_hash: payload.passwordHash,
      referred_by: payload.referrerId || null,
      referral_code: referralCode,
      is_verified: true,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, message: 'Gagal membuat akun: ' + error.message });
  }

  const token = await signCustomerToken({ id: customer.id, name: customer.name, email: customer.email, role: 'customer' });

  res.setHeader('Set-Cookie', buildCookie('customer_token', token, { maxAge: 60 * 60 * 24 * 30 }));

  return res.json({ success: true, hasPin: false }); // belum pernah bikin PIN, bakal diarahin ke halaman buat PIN
}

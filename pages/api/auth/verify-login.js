// pages/api/auth/verify-login.js
import { supabaseAdmin } from '../../../lib/supabase';
import { verifyOtp, normalizePhone } from '../../../lib/otp';
import { signCustomerToken } from '../../../lib/customerAuth';
import { buildCookie } from '../../../lib/cookieHelper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { phone, code } = req.body || {};
  if (!phone || !code) return res.status(400).json({ success: false, message: 'Nomor HP & kode OTP wajib diisi' });

  const payload = await verifyOtp(normalizePhone(phone), 'login', code);
  if (!payload) return res.status(400).json({ success: false, message: 'Kode OTP salah atau sudah kedaluwarsa' });

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, name, email, pin_hash')
    .eq('id', payload.customerId)
    .single();

  if (!customer) return res.status(400).json({ success: false, message: 'Akun tidak ditemukan' });

  const token = await signCustomerToken({ id: customer.id, name: customer.name, email: customer.email, role: 'customer' });
  res.setHeader('Set-Cookie', buildCookie('customer_token', token, { maxAge: 60 * 60 * 24 * 30 }));

  return res.json({ success: true, hasPin: !!customer.pin_hash
});
}

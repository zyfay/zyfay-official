// pages/api/auth/reset-password.js
import { supabaseAdmin } from '../../../lib/supabase';
import { verifyOtp, normalizePhone } from '../../../lib/otp';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, code, newPassword } = req.body || {};
  if (!email?.trim() || !code || !newPassword) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
  }

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, phone')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (!customer) return res.status(400).json({ success: false, message: 'Akun tidak ditemukan' });

  const payload = await verifyOtp(normalizePhone(customer.phone), 'forgot_password', code);
  if (!payload) return res.status(400).json({ success: false, message: 'Kode OTP salah atau sudah kedaluwarsa' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await supabaseAdmin.from('customers').update({ password_hash: passwordHash, updated_at: new Date().toISOString() }).eq('id', customer.id);

  return res.json({ success: true });
}

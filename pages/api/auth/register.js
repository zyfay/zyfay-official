// pages/api/auth/register.js
import { supabaseAdmin } from '../../../lib/supabase';
import { createAndSendOtp, normalizePhone } from '../../../lib/otp';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, phone, password, confirmPassword, referral_code } = req.body || {};

  if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Konfirmasi password tidak cocok' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Format email tidak valid' });
  }

  const normalizedPhone = normalizePhone(phone);

  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id, is_verified')
    .or(`email.eq.${email.trim()},phone.eq.${normalizedPhone}`)
    .maybeSingle();

  if (existing?.is_verified) {
    return res.status(400).json({ success: false, message: 'Email atau nomor HP sudah terdaftar' });
  }

  // Kalau ada referral code, validasi dulu
  let referrerId = null;
  if (referral_code?.trim()) {
    const { data: referrer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('referral_code', referral_code.trim().toUpperCase())
      .maybeSingle();
    if (!referrer) {
      return res.status(400).json({ success: false, message: 'Kode referral tidak ditemukan' });
    }
    referrerId = referrer.id;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await createAndSendOtp(normalizedPhone, 'register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizedPhone,
      passwordHash,
      referrerId,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }

  return res.json({ success: true, phone: normalizedPhone });
}

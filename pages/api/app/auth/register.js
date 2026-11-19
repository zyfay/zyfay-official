// POST /api/app/auth/register
// body: { name, email, phone, password, confirmPassword, referral_code? }
// -> kirim OTP ke WhatsApp, lanjut ke /api/app/auth/verify-register
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { createAndSendOtp, normalizePhone } from '../../../../lib/otp';
import { otpThrottled } from '../../../../lib/appAuth';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { name, email, phone, password, confirmPassword, referral_code } = req.body || {};
  if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
  }
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
  if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Konfirmasi password tidak cocok' });
  if (!/^[^\s@,()]+@[^\s@,()]+\.[^\s@,()]+$/.test(email)) return res.status(400).json({ success: false, message: 'Format email tidak valid' });

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  // Cek email / HP / nama sudah dipakai (login bisa pakai nama, jadi nama harus unik)
  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('is_verified', true)
    .or(`email.eq.${cleanEmail},phone.eq.${normalizedPhone}`)
    .limit(1);
  if (existing?.length) return res.status(400).json({ success: false, message: 'Email atau nomor HP sudah terdaftar' });

  const { data: nameTaken } = await supabaseAdmin.from('customers').select('id').ilike('name', cleanName).limit(1);
  if (nameTaken?.length) return res.status(400).json({ success: false, message: 'Nama itu sudah dipakai akun lain' });

  let referrerId = null;
  if (referral_code?.trim()) {
    const { data: referrer } = await supabaseAdmin
      .from('customers').select('id').eq('referral_code', referral_code.trim().toUpperCase()).maybeSingle();
    if (!referrer) return res.status(400).json({ success: false, message: 'Kode referral tidak ditemukan' });
    referrerId = referrer.id;
  }

  if (await otpThrottled(normalizedPhone)) {
    return res.status(429).json({ success: false, message: 'Terlalu sering minta OTP, coba lagi 10 menit lagi' });
  }

  try {
    await createAndSendOtp(normalizedPhone, 'register', {
      name: cleanName, email: cleanEmail, phone: normalizedPhone,
      passwordHash: await bcrypt.hash(password, 10), referrerId,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
  return res.json({ success: true, phone: normalizedPhone });
}

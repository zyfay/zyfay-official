// POST /api/app/auth/login
// body: { identifier (nama/email), password, phone } -> kirim OTP WhatsApp, lanjut verify-login
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { createAndSendOtp, normalizePhone } from '../../../../lib/otp';
import { otpThrottled } from '../../../../lib/appAuth';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { identifier, password, phone } = req.body || {};
  if (!identifier?.trim() || !password || !phone?.trim()) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
  }

  const normalizedPhone = normalizePhone(phone);
  const id = identifier.trim().replace(/[,()]/g, ''); // cegah injeksi filter .or()

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, phone, password_hash, is_verified')
    .or(`email.eq.${id.toLowerCase()},name.eq.${id}`)
    .maybeSingle();

  const invalidMsg = 'Nama/email, password, atau no HP tidak cocok';
  if (!customer || !customer.is_verified || customer.phone !== normalizedPhone) {
    return res.status(400).json({ success: false, message: invalidMsg });
  }
  if (!(await bcrypt.compare(password, customer.password_hash))) {
    return res.status(400).json({ success: false, message: invalidMsg });
  }

  if (await otpThrottled(normalizedPhone)) {
    return res.status(429).json({ success: false, message: 'Terlalu sering minta OTP, coba lagi 10 menit lagi' });
  }

  try {
    await createAndSendOtp(normalizedPhone, 'login', { customerId: customer.id });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
  return res.json({ success: true, phone: normalizedPhone });
}

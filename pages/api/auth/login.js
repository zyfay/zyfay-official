// pages/api/auth/login.js
import { supabaseAdmin } from '../../../lib/supabase';
import { createAndSendOtp, normalizePhone } from '../../../lib/otp';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { identifier, password, phone } = req.body || {};
  if (!identifier?.trim() || !password || !phone?.trim()) {
    return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });
  }

  const normalizedPhone = normalizePhone(phone);

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, name, email, phone, password_hash, is_verified')
    .or(`email.eq.${identifier.trim().toLowerCase()},name.eq.${identifier.trim()}`)
    .maybeSingle();

  // Pesan error sengaja digeneralisir (gak bilang spesifik mana yang salah) buat keamanan
  const invalidMsg = 'Nama/email, password, atau no HP tidak cocok';

  if (!customer || !customer.is_verified) return res.status(400).json({ success: false, message: invalidMsg });
  if (customer.phone !== normalizedPhone) return res.status(400).json({ success: false, message: invalidMsg });

  const validPassword = await bcrypt.compare(password, customer.password_hash);
  if (!validPassword) return res.status(400).json({ success: false, message: invalidMsg });

  try {
    await createAndSendOtp(normalizedPhone, 'login', { customerId: customer.id });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }

  return res.json({ success: true, phone: normalizedPhone });
}

// pages/api/auth/forgot-password.js
import { supabaseAdmin } from '../../../lib/supabase';
import { createAndSendOtp } from '../../../lib/otp';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body || {};
  if (!email?.trim()) return res.status(400).json({ success: false, message: 'Email wajib diisi' });

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, phone')
    .eq('email', email.trim().toLowerCase())
    .eq('is_verified', true)
    .maybeSingle();

  // Tetep balikin sukses meski email gak ketemu, biar orang luar gak bisa nebak2 email terdaftar
  if (!customer) return res.json({ success: true });

  try {
    await createAndSendOtp(customer.phone, 'forgot_password', { customerId: customer.id });
  } catch (e) {
    console.error('Gagal kirim OTP forgot-password:', e.message);
  }

  // Nomor HP disensor dikit biar user tau OTP kekirim ke nomor yang bener tanpa expose penuh
  const maskedPhone = customer.phone.replace(/(\d{4})\d+(\d{3})/, '$1xxxx$2');
  return res.json({ success: true, maskedPhone 
});
}

// lib/otp.js
import { supabaseAdmin } from './supabase';
import { sendViaFonnte } from './fonnte';

const OTP_EXPIRY_MINUTES = 5;

export function normalizePhone(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  if (!digits.startsWith('62')) digits = '62' + digits;
  return digits;
}

export async function createAndSendOtp(phone, purpose, payload = {}) {
  const normalizedPhone = normalizePhone(phone);
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digit

  const { error } = await supabaseAdmin.from('otp_codes').insert({
    phone: normalizedPhone,
    code,
    purpose,
    payload,
    expires_at: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString(),
  });
  if (error) throw new Error('Gagal membuat OTP: ' + error.message);

  const purposeLabel = {
    register: 'pendaftaran akun',
    login: 'login akun',
    forgot_password: 'reset password',
  }[purpose] || 'verifikasi';

  const message = `*Zyfay Official*\n\nKode OTP kamu buat ${purposeLabel}:\n\n*${code}*\n\nBerlaku ${OTP_EXPIRY_MINUTES} menit. Jangan kasih kode ini ke siapapun, termasuk yang ngaku admin Zyfay.`;

  await sendViaFonnte(normalizedPhone, message);

  await supabaseAdmin.from('whatsapp_messages').insert({
    phone: normalizedPhone,
    message: `[OTP-${purpose}] ${code}`,
    status: 'sent',
  });

  return normalizedPhone;
}

// Verifikasi kode OTP. Return payload yang disimpan pas createAndSendOtp kalau valid, null kalau invalid/expired.
export async function verifyOtp(phone, purpose, code) {
  const normalizedPhone = normalizePhone(phone);

  const { data: otp } = await supabaseAdmin
    .from('otp_codes')
    .select('*')
    .eq('phone', normalizedPhone)
    .eq('purpose', purpose)
    .eq('code', code)
    .eq('is_used', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) return null;

  await supabaseAdmin.from('otp_codes').update({ is_used: true }).eq('id', otp.id);

  return otp.pay
load || {};
}

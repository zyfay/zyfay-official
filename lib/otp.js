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
    change_email: 'ganti email akun',
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

// Cek kode OTP TANPA menandainya terpakai. Return { id, payload } kalau valid, null kalau salah/kedaluwarsa.
// Dipisah dari consumeOtp biar OTP gak "hangus" kalau proses setelahnya (misal bikin akun) gagal.
export async function peekOtp(phone, purpose, code) {
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
  return { id: otp.id, payload: otp.payload || {} };
}

export async function consumeOtp(id) {
  await supabaseAdmin.from('otp_codes').update({ is_used: true }).eq('id', id);
}

// Verifikasi + langsung hanguskan (dipakai login & reset password). Return payload kalau valid, null kalau tidak.
export async function verifyOtp(phone, purpose, code) {
  const otp = await peekOtp(phone, purpose, code);
  if (!otp) return null;
  await consumeOtp(otp.id);
  return otp.payload;
}

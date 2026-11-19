// lib/appAuth.js
// Auth customer buat APP (mobile): token JWT dikirim lewat header, bukan cookie.
//   x-api-key: <api key>           -> dicek verifyApiKey (lib/apiAuth.js)
//   Authorization: Bearer <token>  -> token customer dari verify-login / verify-register
import { verifyCustomerToken } from './customerAuth';
import { supabaseAdmin } from './supabase';

export async function getAppCustomer(req) {
  const raw = req.headers['x-customer-token'] || req.headers['authorization'] || '';
  const token = String(raw).replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const payload = await verifyCustomerToken(token);
  if (!payload || payload.role !== 'customer') return null;
  return payload; // { id, name, email, role }
}

// Batasi kirim OTP: maks 3x per 10 menit per nomor HP (anti spam WhatsApp)
export async function otpThrottled(phone) {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from('otp_codes')
    .select('id', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('created_at', since);
  return (count || 0) >= 3;
}

// "Budi Santoso" -> "Bu***"  (peringkat tampil publik, jangan bocorin nama lengkap)
export function maskName(name) {
  const n = String(name || '').trim();
  if (!n) return 'Anonim';
  return n.slice(0, Math.min(2, n.length)) + '***';
}

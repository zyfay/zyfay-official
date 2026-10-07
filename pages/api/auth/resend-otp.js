// pages/api/auth/resend-otp.js
import { supabaseAdmin } from '../../../lib/supabase';
import { createAndSendOtp, normalizePhone } from '../../../lib/otp';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { phone, purpose } = req.body || {};
  if (!phone || !purpose) return res.status(400).json({ success: false, message: 'Data tidak lengkap' });

  const normalizedPhone = normalizePhone(phone);

  const { data: lastOtp } = await supabaseAdmin
    .from('otp_codes')
    .select('payload')
    .eq('phone', normalizedPhone)
    .eq('purpose', purpose)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastOtp) return res.status(400).json({ success: false, message: 'Gak ada permintaan OTP sebelumnya buat nomor ini' });

  try {
    await createAndSendOtp(normalizedPhone, purpose, lastOtp.payload || {});
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }

  return res.json({ success: true 
});
}

// POST /api/app/auth/verify-register
// body: { phone, code }  -> akun dibuat, balikin token JWT (30 hari)
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { peekOtp, consumeOtp, normalizePhone } from '../../../../lib/otp';
import { signCustomerToken } from '../../../../lib/customerAuth';
import { creditBalance } from '../../../../lib/balance';
import { REFERRAL_BONUS } from '../../../../lib/akunConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) return res.status(400).json({ success: false, message: 'Nomor HP & kode OTP wajib diisi' });

    const otp = await peekOtp(normalizePhone(phone), 'register', String(code));
    if (!otp) return res.status(400).json({ success: false, message: 'Kode OTP salah atau sudah kedaluwarsa' });
    const p = otp.payload;

    const referralCode =
      (p.name || 'ZY').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase().padEnd(2, 'Z') +
      Math.floor(1000 + Math.random() * 9000);

    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .insert({
        name: p.name, email: p.email, phone: p.phone, password_hash: p.passwordHash,
        referred_by: p.referrerId || null, referral_code: referralCode, is_verified: true,
      })
      .select('id, name, email')
      .single();

    if (error) {
      const dup = error.code === '23505';
      return res.status(dup ? 400 : 500).json({
        success: false,
        message: dup ? 'Email atau nomor HP ini sudah terdaftar' : 'Gagal membuat akun: ' + error.message,
      });
    }

    await consumeOtp(otp.id);

    if (p.referrerId) {
      try {
        await creditBalance(p.referrerId, REFERRAL_BONUS, { kind: 'referral', adminName: 'referral', note: `Bonus referral: ${customer.name} daftar pakai kodemu` });
        await creditBalance(customer.id, REFERRAL_BONUS, { kind: 'referral', adminName: 'referral', note: 'Bonus daftar pakai kode referral' });
      } catch (e) { console.error('Gagal kasih bonus referral:', e.message); }
    }

    const token = await signCustomerToken({ id: customer.id, name: customer.name, email: customer.email, role: 'customer' });
    return res.json({ success: true, token, hasPin: false, user: { id: customer.id, name: customer.name, email: customer.email } });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Server error: ' + (e?.message || 'unknown') });
  }
}

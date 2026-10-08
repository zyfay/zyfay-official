// pages/api/auth/verify-register.js
import { supabaseAdmin } from '../../../lib/supabase';
import { peekOtp, consumeOtp, normalizePhone } from '../../../lib/otp';
import { signCustomerToken } from '../../../lib/customerAuth';
import { buildCookie } from '../../../lib/cookieHelper';
import { creditBalance } from '../../../lib/balance';
import { REFERRAL_BONUS } from '../../../lib/akunConfig';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { phone, code } = req.body || {};
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: 'Nomor HP & kode OTP wajib diisi' });
    }

    // Cek OTP dulu tanpa menghanguskannya
    const otp = await peekOtp(normalizePhone(phone), 'register', code);
    if (!otp) {
      return res.status(400).json({ success: false, message: 'Kode OTP salah atau sudah kedaluwarsa' });
    }
    const payload = otp.payload;

    const referralCode =
      (payload.name || 'ZY').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase().padEnd(2, 'Z') +
      Math.floor(1000 + Math.random() * 9000);

    const { data: customer, error } = await supabaseAdmin
      .from('customers')
      .insert({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password_hash: payload.passwordHash,
        referred_by: payload.referrerId || null,
        referral_code: referralCode,
        is_verified: true,
      })
      .select()
      .single();

    if (error) {
      console.error('verify-register insert error:', error);
      const duplicate = error.code === '23505';
      return res.status(duplicate ? 400 : 500).json({
        success: false,
        message: duplicate
          ? 'Email atau nomor HP ini sudah terdaftar'
          : 'Gagal membuat akun: ' + error.message,
      });
    }

    // Akun udah jadi, baru OTP-nya dihanguskan
    await consumeOtp(otp.id);

    // Bonus referral: pengajak & teman yang diajak sama-sama dapat saldo.
    // Kalau gagal, jangan gagalin pendaftaran (akun udah jadi) — cukup dicatat di log.
    if (payload.referrerId) {
      try {
        await creditBalance(payload.referrerId, REFERRAL_BONUS, {
          kind: 'referral', adminName: 'referral', note: `Bonus referral: ${customer.name} daftar pakai kodemu`,
        });
        await creditBalance(customer.id, REFERRAL_BONUS, {
          kind: 'referral', adminName: 'referral', note: 'Bonus daftar pakai kode referral',
        });
      } catch (e) {
        console.error('Gagal kasih bonus referral:', e.message);
      }
    }

    const token = await signCustomerToken({
      id: customer.id, name: customer.name, email: customer.email, role: 'customer',
    });
    res.setHeader('Set-Cookie', buildCookie('customer_token', token, { maxAge: 60 * 60 * 24 * 30 }));

    return res.json({ success: true, hasPin: false });
  } catch (e) {
    // Selalu balikin JSON, biar pesan error aslinya muncul di layar (bukan halaman error HTML)
    console.error('verify-register crash:', e);
    return res.status(500).json({ success: false, message: 'Server error: ' + (e?.message || 'unknown') });
  }
}

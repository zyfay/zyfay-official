// pages/api/akun/email.js — ganti email, wajib verifikasi OTP via WhatsApp bot Zyfay
import { getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';
import { createAndSendOtp, verifyOtp } from '../../../lib/otp';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const customer = await getUnlockedCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Sesi berakhir, masukkan PIN lagi' });

  const { action, newEmail, code } = req.body || {};

  const { data: row } = await supabaseAdmin.from('customers').select('phone, email').eq('id', customer.id).single();
  if (!row) return res.status(404).json({ success: false, message: 'Akun tidak ditemukan' });

  try {
    // Tahap 1: minta OTP ke WhatsApp yang terdaftar
    if (action === 'request') {
      const email = String(newEmail || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Format email tidak valid' });
      }
      if (email === row.email) {
        return res.status(400).json({ success: false, message: 'Itu email kamu yang sekarang' });
      }
      const { data: taken } = await supabaseAdmin.from('customers').select('id').eq('email', email).limit(1);
      if (taken && taken.length > 0) {
        return res.status(400).json({ success: false, message: 'Email itu sudah dipakai akun lain' });
      }

      await createAndSendOtp(row.phone, 'change_email', { customerId: customer.id, newEmail: email });
      const masked = row.phone.replace(/(\d{4})\d+(\d{3})/, '$1xxxx$2');
      return res.json({ success: true, maskedPhone: masked });
    }

    // Tahap 2: cek OTP lalu simpan email baru
    if (action === 'verify') {
      if (!/^\d{6}$/.test(String(code || ''))) {
        return res.status(400).json({ success: false, message: 'Kode OTP harus 6 digit' });
      }
      const payload = await verifyOtp(row.phone, 'change_email', String(code));
      if (!payload || payload.customerId !== customer.id || !payload.newEmail) {
        return res.status(400).json({ success: false, message: 'Kode OTP salah atau sudah kedaluwarsa' });
      }

      const { error } = await supabaseAdmin
        .from('customers')
        .update({ email: payload.newEmail, updated_at: new Date().toISOString() })
        .eq('id', customer.id);
      if (error) {
        const dup = error.code === '23505';
        return res.status(dup ? 400 : 500).json({ success: false, message: dup ? 'Email itu sudah dipakai akun lain' : error.message });
      }
      return res.json({ success: true, email: payload.newEmail });
    }

    return res.status(400).json({ success: false, message: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('akun/email error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

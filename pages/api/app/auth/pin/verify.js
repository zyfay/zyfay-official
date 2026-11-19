// pages/api/app/auth/pin/verify.js
// POST /api/app/auth/pin/verify
// header: x-api-key + Authorization: Bearer <token>
// body: { pin: "123456" }
// Balikan kalau benar: { success: true, balance: 25000 }
//
// Anti tebak-tebakan: 5x salah -> dikunci 15 menit. Butuh 2 kolom di tabel customers
// (lihat pin-lockout.sql). Kalau kolomnya belum dibuat, PIN tetap jalan tapi tanpa penguncian.
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { verifyApiKey } from '../../../../../lib/apiAuth';
import { getAppCustomer } from '../../../../../lib/appAuth';

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const me = await getAppCustomer(req);
  if (!me) return res.status(401).json({ success: false, message: 'Belum login atau token kedaluwarsa' });

  const { pin } = req.body || {};
  if (!/^\d{6}$/.test(pin || '')) {
    return res.status(400).json({ success: false, message: 'PIN harus 6 digit angka' });
  }

  const { data: row } = await supabaseAdmin.from('customers').select('*').eq('id', me.id).single();
  if (!row) return res.status(401).json({ success: false, message: 'Akun tidak ditemukan' });
  if (!row.pin_hash) return res.status(400).json({ success: false, message: 'Belum ada PIN, silakan buat dulu' });

  const hasLockCols = 'pin_attempts' in row;

  if (hasLockCols && row.pin_locked_until && new Date(row.pin_locked_until) > new Date()) {
    const mins = Math.ceil((new Date(row.pin_locked_until).getTime() - Date.now()) / 60000);
    return res.status(429).json({ success: false, message: `Terlalu banyak salah PIN. Coba lagi ${mins} menit lagi.` });
  }

  const valid = await bcrypt.compare(pin, row.pin_hash);

  if (!valid) {
    if (!hasLockCols) return res.status(400).json({ success: false, message: 'PIN salah' });
    const fails = (row.pin_attempts || 0) + 1;
    const lock = fails >= MAX_FAILS;
    await supabaseAdmin
      .from('customers')
      .update({
        pin_attempts: lock ? 0 : fails,
        pin_locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null,
      })
      .eq('id', me.id);
    return res.status(400).json({
      success: false,
      message: lock
        ? `Terlalu banyak salah PIN. Coba lagi ${LOCK_MINUTES} menit lagi.`
        : `PIN salah. Sisa percobaan ${MAX_FAILS - fails}x.`,
    });
  }

  if (hasLockCols && (row.pin_attempts || row.pin_locked_until)) {
    await supabaseAdmin.from('customers').update({ pin_attempts: 0, pin_locked_until: null }).eq('id', me.id);
  }

  return res.json({ success: true, balance: Number(row.balance) || 0 });
}

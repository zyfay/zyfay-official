// pages/api/app/auth/pin/setup.js
// POST /api/app/auth/pin/setup
// header: x-api-key + Authorization: Bearer <token>
// body: { pin: "123456", current_pin?: "654321" }   (current_pin wajib kalau akun sudah punya PIN)
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { verifyApiKey } from '../../../../../lib/apiAuth';
import { getAppCustomer } from '../../../../../lib/appAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const me = await getAppCustomer(req);
  if (!me) return res.status(401).json({ success: false, message: 'Belum login atau token kedaluwarsa' });

  const { pin, current_pin } = req.body || {};
  if (!/^\d{6}$/.test(pin || '')) {
    return res.status(400).json({ success: false, message: 'PIN harus 6 digit angka' });
  }

  const { data: row } = await supabaseAdmin.from('customers').select('pin_hash').eq('id', me.id).single();
  if (!row) return res.status(401).json({ success: false, message: 'Akun tidak ditemukan' });

  // Sudah punya PIN -> ganti PIN harus pakai PIN lama (beda dari web yang menimpa begitu saja)
  if (row.pin_hash) {
    if (!/^\d{6}$/.test(current_pin || '')) {
      return res.status(400).json({ success: false, message: 'Masukkan PIN lama dulu' });
    }
    const ok = await bcrypt.compare(current_pin, row.pin_hash);
    if (!ok) return res.status(400).json({ success: false, message: 'PIN lama salah' });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const { error } = await supabaseAdmin
    .from('customers')
    .update({ pin_hash: pinHash, updated_at: new Date().toISOString() })
    .eq('id', me.id);
  if (error) return res.status(500).json({ success: false, message: 'Gagal menyimpan PIN' });

  return res.json({ success: tru
e });
}

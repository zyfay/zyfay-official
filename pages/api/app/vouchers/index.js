// pages/api/app/vouchers/index.js
// GET /api/app/vouchers
// header: x-api-key
// Balikan: { success, vouchers: [{ code, discount_percent, expires_at }] }
// Hanya voucher yang aktif dan belum kedaluwarsa. Semua voucher aktif akan terlihat di aplikasi.
// Mau menyembunyikan voucher tertentu? Tambah kolom di Supabase:
//   alter table vouchers add column if not exists is_public boolean not null default true;
// lalu set is_public = false untuk voucher privat (otomatis tidak ikut ditampilkan).
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { data, error } = await supabaseAdmin
    .from('vouchers')
    .select('*')
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true });

  if (error) return res.status(500).json({ success: false, message: 'Gagal memuat voucher' });

  const vouchers = (data || [])
    .filter((v) => v.is_public !== false)
    .map((v) => ({ code: v.code, discount_percent: v.discount_percent, expires_at: v.expires_at }));

  return res.json({ success: true, vouchers });
}

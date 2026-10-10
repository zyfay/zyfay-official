// pages/api/akun/claim-orders.js
// Pesanan yang dibuat sebagai TAMU (disimpan di riwayat lokal browser) ikut dipindah ke akun
// begitu pemiliknya daftar/login di perangkat yang sama.
import { getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';

const MAX_IDS = 20;
const WINDOW_HOURS = 24; // hanya pesanan "hari itu" (24 jam terakhir)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const customer = await getUnlockedCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Sesi berakhir, masukkan PIN lagi' });

  const ids = Array.isArray(req.body?.ids)
    ? [...new Set(req.body.ids.filter((x) => typeof x === 'string' && /^ZY-\d{10,15}$/.test(x)))].slice(0, MAX_IDS)
    : [];
  if (ids.length === 0) return res.json({ success: true, claimed: 0 });

  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();

  // Hanya pesanan yang: ada, belum dimiliki akun mana pun, dan dibuat dalam 24 jam terakhir.
  // Update bersyarat (customer_id masih kosong) -> dua akun tidak bisa merebut pesanan yang sama.
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ customer_id: customer.id })
    .in('id', ids)
    .is('customer_id', null)
    .gte('created_at', since)
    .select('id');

  if (error) {
    // Kolom customer_id belum ada (SQL belum dijalankan): jangan ganggu pengguna
    console.error('claim-orders error:', error.message);
    return res.json({ success: true, claimed: 0 });
  }

  return res.json({ success: true, claimed: data?.length || 0 });
}

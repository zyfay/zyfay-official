// pages/api/akun/history.js — riwayat gabungan: pesanan + deposit + perubahan saldo
import { getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const customer = await getUnlockedCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Sesi berakhir, masukkan PIN lagi' });

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  const [orders, deposits, logs] = await Promise.all([
    supabaseAdmin.from('orders')
      .select('id, product_name, game_name, product_price, order_status, payment_method, created_at')
      .eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(limit),
    supabaseAdmin.from('deposits')
      .select('id, nominal, method_name, status, created_at')
      .eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(limit),
    supabaseAdmin.from('balance_logs')
      .select('id, amount, note, kind, created_at')
      .eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(limit),
  ]);

  // Kalau salah satu tabel/kolom belum ada (SQL belum dijalankan), bagian itu dilewati — jangan bikin semuanya gagal.
  const items = [
    ...(orders.data || []).map((o) => ({
      type: 'order', id: o.id, title: o.product_name,
      subtitle: o.payment_method === 'saldo' ? `${o.game_name} · Bayar saldo` : o.game_name,
      amount: o.product_price, status: o.order_status, created_at: o.created_at,
    })),
    ...(deposits.data || []).map((d) => ({
      type: 'deposit', id: d.id, title: 'Deposit saldo', subtitle: d.method_name,
      amount: d.nominal, status: d.status, created_at: d.created_at,
    })),
    // Deposit & pembelian sudah punya barisnya sendiri (tabel deposits / orders), jadi log-nya tidak ditampilkan dobel
    ...(logs.data || []).filter((l) => !['deposit', 'purchase'].includes(l.kind)).map((l) => ({
      type: 'saldo', id: l.id,
      title: l.kind === 'referral' ? 'Bonus referral' : l.kind === 'refund' ? 'Pengembalian saldo' : 'Penyesuaian saldo',
      subtitle: l.note, amount: l.amount, status: 'success', created_at: l.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  return res.json({ success: true, items });
}

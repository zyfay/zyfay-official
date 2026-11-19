// GET /api/app/leaderboard?type=buyers|topups&period=all|month|week&limit=10
//  buyers : peringkat total belanja per pembeli (jumlah order sukses + total Rp)
//  topups : peringkat top-up TERBESAR (1 transaksi), diurutkan dari harga tertinggi
// Hanya order yang payment_status='paid' dan order_status='success'. Nama disamarkan.
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { maskName } from '../../../../lib/appAuth';

function sinceDate(period) {
  const d = new Date();
  if (period === 'week') { d.setDate(d.getDate() - 7); return d.toISOString(); }
  if (period === 'month') { d.setDate(d.getDate() - 30); return d.toISOString(); }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const type = req.query.type === 'topups' ? 'topups' : 'buyers';
  const period = ['week', 'month'].includes(req.query.period) ? req.query.period : 'all';
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const since = sinceDate(period);

  // Ambil order sukses per 1000 baris (batas default Supabase), maks 10 halaman
  const rows = [];
  for (let page = 0; page < 10; page++) {
    let q = supabaseAdmin
      .from('orders')
      .select('user_name, user_email, game_name, product_name, product_price, created_at')
      .eq('payment_status', 'paid')
      .eq('order_status', 'success')
      .order('created_at', { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (since) q = q.gte('created_at', since);
    const { data, error } = await q;
    if (error) return res.status(500).json({ success: false, message: error.message });
    rows.push(...data);
    if (data.length < 1000) break;
  }

  let ranking;
  if (type === 'topups') {
    ranking = rows
      .filter(r => r.product_price > 0)
      .sort((a, b) => b.product_price - a.product_price)
      .slice(0, limit)
      .map((r, i) => ({
        rank: i + 1, name: maskName(r.user_name), game: r.game_name,
        product: r.product_name, amount: r.product_price, date: r.created_at,
      }));
  } else {
    const byUser = new Map();
    for (const r of rows) {
      const key = String(r.user_email || '').toLowerCase();
      if (!key) continue;
      const cur = byUser.get(key) || { name: r.user_name, total: 0, orders: 0 };
      cur.total += r.product_price || 0;
      cur.orders += 1;
      byUser.set(key, cur); // rows urut terbaru dulu -> nama diambil dari order terbaru
      if (!cur.name) cur.name = r.user_name;
    }
    ranking = [...byUser.values()]
      .sort((a, b) => b.total - a.total || b.orders - a.orders)
      .slice(0, limit)
      .map((u, i) => ({ rank: i + 1, name: maskName(u.name), total_spent: u.total, total_orders: u.orders }));
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.json({ success: true, type, period, ranking });
}

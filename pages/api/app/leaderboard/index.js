// GET /api/app/leaderboard?type=buyers|topups&period=all|month|week&limit=10&only_members=0|1
//  buyers : peringkat total belanja PER AKUN (jumlah order sukses + total Rp)
//  topups : peringkat top-up TERBESAR (1 transaksi), diurutkan dari harga tertinggi
// Hanya order payment_status='paid' dan order_status='success'. Nama disamarkan.
//
// Order dikaitkan ke akun lewat (berurutan): customer_id -> email -> no HP.
// Order yang tidak cocok ke akun mana pun (tamu) dihitung per email dan ditandai is_member:false.
// Pakai ?only_members=1 kalau mau tamu tidak ikut peringkat.
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { maskName } from '../../../../lib/appAuth';
import { normalizePhone } from '../../../../lib/otp';

function sinceDate(period) {
  const d = new Date();
  if (period === 'week') { d.setDate(d.getDate() - 7); return d.toISOString(); }
  if (period === 'month') { d.setDate(d.getDate() - 30); return d.toISOString(); }
  return null;
}

const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));
const safe = v => String(v).replace(/[,()"]/g, ''); // aman dipakai di filter .or()

async function loadAccounts(rows) {
  const ids = new Set(), emails = new Set(), phones = new Set();
  for (const r of rows) {
    if (r.customer_id) ids.add(r.customer_id);
    if (r.user_email) emails.add(safe(r.user_email).toLowerCase());
    if (r.customer_phone) phones.add(normalizePhone(r.customer_phone));
  }
  const accounts = new Map(); // id -> { id, name, email, phone }
  const add = list => (list || []).forEach(c => accounts.set(c.id, c));
  const cols = 'id, name, email, phone';

  for (const part of chunk([...ids], 100)) {
    const { data } = await supabaseAdmin.from('customers').select(cols).eq('is_verified', true).in('id', part);
    add(data);
  }
  for (const part of chunk([...emails], 50)) {
    const { data } = await supabaseAdmin.from('customers').select(cols).eq('is_verified', true)
      .or(part.map(e => `email.eq.${e}`).join(','));
    add(data);
  }
  for (const part of chunk([...phones], 50)) {
    const { data } = await supabaseAdmin.from('customers').select(cols).eq('is_verified', true)
      .or(part.map(p => `phone.eq.${p}`).join(','));
    add(data);
  }

  const byEmail = new Map(), byPhone = new Map();
  for (const c of accounts.values()) {
    if (c.email) byEmail.set(c.email.toLowerCase(), c);
    if (c.phone) byPhone.set(c.phone, c);
  }
  return { accounts, byEmail, byPhone };
}

// Tentukan "siapa" pemilik order: akun (kalau ketemu) atau tamu (per email)
function resolveOwner(r, ctx) {
  let acc = (r.customer_id && ctx.accounts.get(r.customer_id)) || null;
  if (!acc && r.user_email) acc = ctx.byEmail.get(String(r.user_email).toLowerCase()) || null;
  if (!acc && r.customer_phone) acc = ctx.byPhone.get(normalizePhone(r.customer_phone)) || null;
  if (acc) return { key: 'acc:' + acc.id, name: acc.name, member: true };
  const email = String(r.user_email || '').toLowerCase();
  return { key: email ? 'guest:' + email : null, name: r.user_name, member: false };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const type = req.query.type === 'topups' ? 'topups' : 'buyers';
  const period = ['week', 'month'].includes(req.query.period) ? req.query.period : 'all';
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
  const onlyMembers = req.query.only_members === '1';
  const since = sinceDate(period);

  // Ambil order sukses per 1000 baris (batas default Supabase), maks 10 halaman
  const rows = [];
  for (let page = 0; page < 10; page++) {
    let q = supabaseAdmin
      .from('orders')
      .select('customer_id, customer_phone, user_name, user_email, game_name, product_name, product_price, created_at')
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

  const ctx = await loadAccounts(rows);
  const owned = rows
    .map(r => ({ r, o: resolveOwner(r, ctx) }))
    .filter(x => x.o.key && (!onlyMembers || x.o.member));

  let ranking;
  if (type === 'topups') {
    ranking = owned
      .filter(x => x.r.product_price > 0)
      .sort((a, b) => b.r.product_price - a.r.product_price)
      .slice(0, limit)
      .map((x, i) => ({
        rank: i + 1, name: maskName(x.o.name), is_member: x.o.member,
        game: x.r.game_name, product: x.r.product_name, amount: x.r.product_price, date: x.r.created_at,
      }));
  } else {
    const byOwner = new Map();
    for (const { r, o } of owned) {
      const cur = byOwner.get(o.key) || { name: o.name, member: o.member, total: 0, orders: 0 };
      cur.total += r.product_price || 0;
      cur.orders += 1;
      byOwner.set(o.key, cur);
    }
    ranking = [...byOwner.values()]
      .sort((a, b) => b.total - a.total || b.orders - a.orders)
      .slice(0, limit)
      .map((u, i) => ({ rank: i + 1, name: maskName(u.name), is_member: u.member, total_spent: u.total, total_orders: u.orders }));
  }

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  return res.json({ success: true, type, period, ranking });
}

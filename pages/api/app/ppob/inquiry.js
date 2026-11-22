// pages/api/app/ppob/inquiry.js
// POST /api/app/ppob/inquiry   body: { product_id, customer_no }
// Cek tagihan pascabayar (PLN pasca, PDAM, BPJS, internet). Nominal dihitung di SERVER dan disimpan;
// klien tidak pernah mengirim nominal. Hasilnya dipakai di /api/app/ppob/bayar lewat inquiry_id.
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { getAppCustomer } from '../../../../lib/appAuth';
import { tv, isTvIpBlocked } from '../../../../lib/tokovoucher';
import { parsePascaInquiry, totalCharge, maskPersonName } from '../../../../lib/ppob';

const INQUIRY_TTL_MS = 10 * 60 * 1000; // tagihan berlaku 10 menit
const CACHE_MS = 5 * 60 * 1000;        // inquiry yang sama dalam 5 menit dipakai ulang (hemat request ke TokoVoucher)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function present(row, product) {
  const mask = process.env.PPOB_MASK_NAME !== '0';
  return {
    inquiry_id: row.id,
    product: { id: product.id, name: product.name, game_id: product.game_id },
    customer_no: row.customer_no,
    customer_name: mask ? maskPersonName(row.customer_name) : row.customer_name,
    period: row.period || null,
    due_date: row.raw?.due_date || null,
    detail: { tagihan: row.tagihan, admin: row.admin_fee, denda: row.denda, months: row.raw?.jml_bulan || 1, info: row.raw?.data || '' },
    amount: row.total_charge,
    expires_at: row.expires_at,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { product_id, customer_no } = req.body || {};
  const customerNo = String(customer_no ?? '').trim();
  if (!UUID.test(String(product_id || ''))) return res.status(400).json({ success: false, message: 'product_id tidak valid' });
  if (!/^[0-9A-Za-z.\-]{4,32}$/.test(customerNo)) return res.status(400).json({ success: false, message: 'Nomor pelanggan tidak valid' });
  if (!tv.isConfigured()) return res.status(503).json({ success: false, message: 'Layanan tagihan belum aktif' });

  const { data: product } = await supabaseAdmin
    .from('products').select('id, name, tv_code, game_id, metadata').eq('id', product_id).maybeSingle();
  const meta = product?.metadata && typeof product.metadata === 'object' ? product.metadata : {};
  if (!product || !product.tv_code || meta.is_postpaid !== true || meta.tv_active === false) {
    return res.status(404).json({ success: false, message: 'Produk tagihan tidak ditemukan' });
  }

  // Pakai ulang inquiry yang masih segar & belum dibayar
  const since = new Date(Date.now() - CACHE_MS).toISOString();
  const { data: cached } = await supabaseAdmin
    .from('ppob_inquiries').select('*')
    .eq('product_id', product.id).eq('customer_no', customerNo)
    .is('order_id', null).gt('expires_at', new Date().toISOString()).gte('created_at', since)
    .order('created_at', { ascending: false }).limit(1);
  if (cached?.[0]) return res.json({ success: true, cached: true, ...present(cached[0], product) });

  const refId = crypto.randomUUID();
  let raw;
  try {
    raw = await tv.inquiryPasca({ ref_id: refId, produk: product.tv_code, tujuan: customerNo });
  } catch (e) {
    console.error('PPOB inquiry error:', e.message);
    return res.status(502).json({ success: false, message: 'Gagal menghubungi penyedia tagihan, coba lagi sebentar' });
  }
  if (isTvIpBlocked(raw)) {
    console.error('PPOB inquiry: IP belum di-whitelist di TokoVoucher');
    return res.status(502).json({ success: false, code: 'tv_ip_not_allowed', message: 'Layanan tagihan sedang tidak tersedia' });
  }

  const inq = parsePascaInquiry(raw);
  if (!inq.ok) {
    return res.status(400).json({ success: false, message: inq.message || 'Tagihan tidak ditemukan atau sudah dibayar' });
  }
  const amount = totalCharge(inq, process.env.PPOB_POSTPAID_FEE);
  if (amount <= 0) return res.status(400).json({ success: false, message: 'Tagihan tidak ditemukan atau sudah dibayar' });

  const me = await getAppCustomer(req).catch(() => null);
  const { data: row, error } = await supabaseAdmin.from('ppob_inquiries').insert({
    ref_id: refId, product_id: product.id, tv_code: product.tv_code,
    customer_no: customerNo, customer_name: inq.customer_name, period: inq.period,
    tagihan: inq.tagihan, admin_fee: inq.admin, denda: inq.denda,
    tv_price: inq.price, tv_selling_price: inq.selling_price, total_charge: amount,
    customer_id: me?.id || null,
    raw: { due_date: inq.due_date, jml_bulan: inq.months, data: inq.info },
    expires_at: new Date(Date.now() + INQUIRY_TTL_MS).toISOString(),
  }).select().single();
  if (error) {
    console.error('PPOB inquiry insert error:', error.message);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan tagihan' });
  }

  return res.json({ success: true, cached: false, ...present(row, product) });
}

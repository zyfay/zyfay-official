// lib/tokovoucher.js
import crypto from 'crypto';

const MEMBER = process.env.TOKOVOUCHER_MEMBER_CODE;
const SECRET = process.env.TOKOVOUCHER_SECRET_KEY;
const SIGNATURE = process.env.TOKOVOUCHER_SIGNATURE_KEY;
const CF_WORKER = 'https://endpoint-zyfay.zyfayofficial.workers.dev';

async function get(endpoint, params = {}) {
  const url = new URL(`https://api.tokovoucher.net${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  return res.json();
}

// Respons TokoVoucher kadang bukan JSON (misal halaman error). Jangan sampai melempar error mentah.
async function readJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { status: 0, error_msg: text.slice(0, 200) || `HTTP ${res.status}` }; }
}

export const tv = {
  // Cek saldo
  getBalance: () => get('/member', {
    member_code: MEMBER,
    signature: SIGNATURE,
  }),

  // List produk
  getProducts: (operator_id, jenis_id) => get('/produk', {
    member_code: MEMBER,
    signature: SIGNATURE,
    operator_id,
    jenis_id,
  }),

  // Semua kategori + operator + jenis + produk dalam SATU request (dipakai impor produk PPOB)
  // Dokumentasi: https://docs.tokovoucher.net/produk/full
  getFullProducts: async () => {
    const url = new URL('https://api.tokovoucher.net/member/produk/full');
    url.searchParams.set('member_code', MEMBER);
    url.searchParams.set('signature', SIGNATURE);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(45000) });
    return readJson(res);
  },

  // Cek tagihan pascabayar (PLN pasca, PDAM, BPJS, internet, dst).
  // Dokumentasi: https://docs.tokovoucher.net/pascabayar/inquiry
  // Catatan: signature di endpoint ini BEDA urutan: md5(REF_ID:MEMBER_CODE:SECRET_KEY)
  inquiryPasca: async ({ ref_id, produk, tujuan, server_id }) => {
    const signature = crypto.createHash('md5').update(`${ref_id}:${MEMBER}:${SECRET}`).digest('hex');
    const res = await fetch('https://api.tokovoucher.id/v1/pascabayar-inq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_id, produk, tujuan,
        server_id: server_id || '',
        member_code: MEMBER,
        signature,
      }),
      signal: AbortSignal.timeout(25000),
    });
    return readJson(res);
  },

  // Buat transaksi via Cloudflare Worker (IP tetap)
  createOrder: async ({ kode_produk, tujuan, server_id, ref_id }) => {
    const res = await fetch(CF_WORKER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_id,
        produk: kode_produk,
        tujuan,
        server_id: server_id || '',
        secret: SECRET,
        member_code: MEMBER,
      }),
    });
    return res.json();
  },

  // Cek status transaksi
  checkOrder: (ref_id) => get('/v1/transaksi/status', {
    ref_id,
    member_code: MEMBER,
    signature: SIGNATURE,
  }),

  isConfigured: () => !!(MEMBER && SECRET && SIGNATURE),
};

// TokoVoucher menolak request dari IP yang belum di-whitelist dengan pesan "Ip Not Allow"
export function isTvIpBlocked(res) {
  const msg = String(res?.error_msg || res?.message || '');
  return /ip\s*not\s*allow/i.test(msg);
}

// lib/tokovoucher.js
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

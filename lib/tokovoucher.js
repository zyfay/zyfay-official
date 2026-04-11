import crypto from 'crypto';

const BASE = 'https://api.tokovoucher.net';
const MEMBER = process.env.TOKOVOUCHER_MEMBER_CODE;
const SECRET = process.env.TOKOVOUCHER_SECRET_KEY;
const SIGNATURE = process.env.TOKOVOUCHER_SIGNATURE_KEY;

async function req(endpoint, method = 'GET', params = null) {
  const base = { member_code: MEMBER, signature: SIGNATURE };
  let url = `${BASE}${endpoint}`;
  const options = { method, headers: { 'Content-Type': 'application/json' } };

  if (method === 'GET') {
    const p = new URLSearchParams({ ...base, ...(params || {}) });
    url += '?' + p.toString();
  } else {
    options.body = JSON.stringify({ ...base, ...params });
  }

  const res = await fetch(url, options);
  return res.json();
}

export const tv = {
  getBalance: () => req('/member', 'GET'),
  getProducts: (kategori) => req('/v1/produk', 'GET', kategori ? { kategori } : {}),
  createOrder: ({ kode_produk, tujuan, ref_id, server_id }) =>
    req('/v1/transaksi', 'GET', {
      ref_id,
      produk: kode_produk,
      tujuan: server_id ? `${tujuan}.${server_id}` : tujuan,
    }),
  checkOrder: (ref_id) => req('/v1/transaksi/status', 'GET', { ref_id }),
  isConfigured: () => !!(MEMBER && SIGNATURE),
};

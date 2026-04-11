// lib/tokovoucher.js
import crypto from 'crypto';

const BASE = 'https://api.tokovoucher.net';
const MEMBER = process.env.TOKOVOUCHER_MEMBER_CODE;
const SECRET = process.env.TOKOVOUCHER_SECRET_KEY;

// Signature = md5(member_code + secret_key)
function signature() {
  return crypto.createHash('md5').update(MEMBER + SECRET).digest('hex');
}

async function req(endpoint, method = 'GET', params = null) {
  const base = { member_code: MEMBER, signature: signature() };
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
  // Cek saldo - GET /member
  getBalance: () => req('/member', 'GET'),

  // List produk - GET /v1/produk
  getProducts: (kategori) => req('/v1/produk', 'GET', kategori ? { kategori } : {}),

  // Buat transaksi - GET /v1/transaksi
  createOrder: ({ kode_produk, tujuan, ref_id, server_id }) =>
    req('/v1/transaksi', 'GET', {
      ref_id,
      produk: kode_produk,
      tujuan: server_id ? `${tujuan}.${server_id}` : tujuan,
    }),

  // Cek status transaksi - GET /v1/transaksi/status
  checkOrder: (ref_id) => req('/v1/transaksi/status', 'GET', { ref_id }),

  isConfigured: () => !!(MEMBER && SECRET && MEMBER !== 'YOUR_MEMBER_CODE'),
};

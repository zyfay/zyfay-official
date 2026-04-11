// lib/tokovoucher.js
import crypto from 'crypto';

const BASE = process.env.TOKOVOUCHER_BASE_URL || 'https://api.tokovoucher.id';
const MEMBER = process.env.TOKOVOUCHER_MEMBER_CODE;
const SECRET = process.env.TOKOVOUCHER_SECRET_KEY;

function sign() {
  return crypto.createHash('md5').update(MEMBER + SECRET).digest('hex');
}

async function req(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const base = { member_code: MEMBER, sign: sign() };

  let url = `${BASE}${endpoint}`;
  let options = { method, headers };

  if (method === 'GET') {
    const p = new URLSearchParams({ ...base, ...(body || {}) });
    url += '?' + p;
  } else {
    options.body = JSON.stringify({ ...base, ...body });
  }

  const res = await fetch(url, options);
  return res.json();
}

export const tv = {
  getProducts: (kode) => req('/v1/daftar/produk', 'GET', kode ? { kode_produk: kode } : {}),
  getBalance: () => req('/v1/saldo', 'GET'),
  createOrder: ({ kode_produk, target, ref_id }) =>
    req('/v1/transaksi', 'POST', { kode_produk, target, ref_id }),
  checkOrder: (ref_id) => req('/v1/cek-transaksi', 'GET', { ref_id }),
  isConfigured: () => !!(MEMBER && SECRET && MEMBER !== 'YOUR_MEMBER_CODE'),
};

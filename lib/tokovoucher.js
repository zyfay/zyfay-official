// lib/tokovoucher.js
import crypto from 'crypto';

const BASE = 'https://api.tokovoucher.net';
const MEMBER = process.env.TOKOVOUCHER_MEMBER_CODE;
const SECRET = process.env.TOKOVOUCHER_SECRET_KEY;
const SIGNATURE = process.env.TOKOVOUCHER_SIGNATURE_KEY;

async function get(endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  return res.json();
}

async function post(endpoint, body = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
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

  // Buat transaksi - pakai POST biar tidak perlu IP tetap
  createOrder: ({ kode_produk, tujuan, server_id, ref_id }) =>
    post('/v1/transaksi', {
      ref_id,
      produk: kode_produk,
      tujuan,
      server_id: server_id || '',
      secret: SECRET,
      member_code: MEMBER,
    }),

  // Cek status transaksi
  checkOrder: (ref_id) => get('/v1/transaksi/status', {
    ref_id,
    member_code: MEMBER,
    signature: SIGNATURE,
  }),

  isConfigured: () => !!(MEMBER && SECRET && SIGNATURE),
};

import crypto from 'crypto';

const BASE = 'https://api.tokovoucher.net';
const TRX_IP = 'http://trx-ip.tokovoucher.net';
const MEMBER = process.env.TOKOVOUCHER_MEMBER_CODE;
const SECRET = process.env.TOKOVOUCHER_SECRET_KEY;
const SIGNATURE = process.env.TOKOVOUCHER_SIGNATURE_KEY;

async function req(endpoint, params = {}, base = BASE) {
  const url = new URL(`${base}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  return res.json();
}

export const tv = {
  getBalance: () => req('/member', {
    member_code: MEMBER,
    signature: SIGNATURE,
  }),

  // Transaksi pakai jalur IP (lebih stabil dari Vercel)
  createOrder: ({ kode_produk, tujuan, server_id, ref_id }) =>
    req('/trx', {
      ref_id,
      produk: kode_produk,
      tujuan,
      server_id: server_id || '',
      secret: SECRET,
      member_code: MEMBER,
    }, TRX_IP),

  checkOrder: (ref_id) => req('/v1/transaksi/status', {
    ref_id,
    member_code: MEMBER,
    signature: SIGNATURE,
  }),

  isConfigured: () => !!(MEMBER && SECRET && SIGNATURE),
};

// lib/tvDeposit.js
// Bikin tiket deposit di TokoVoucher: GET https://api.tokovoucher.net/v1/deposit
// (https://docs.tokovoucher.net/deposit). Secret dikirim lewat query string sesuai
// dokumentasi mereka, jadi URL ini TIDAK PERNAH boleh di-log.
export async function createTvDeposit({ nominal, kode }) {
  const member = process.env.TOKOVOUCHER_MEMBER_CODE;
  const secret = process.env.TOKOVOUCHER_SECRET_KEY;
  if (!member || !secret) throw new Error('TokoVoucher belum dikonfigurasi di server');

  const url = new URL('https://api.tokovoucher.net/v1/deposit');
  url.searchParams.set('member_code', member);
  url.searchParams.set('secret', secret);
  url.searchParams.set('nominal', String(nominal));
  url.searchParams.set('kode', kode);

  const res = await fetch(url.toString());
  const text = await res.text();

  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`TokoVoucher membalas format tak dikenal (HTTP ${res.status})`);
  }

  if (json.status !== 1 || !json.data) {
    throw new Error(json.error_msg || json.message || 'TokoVoucher menolak permintaan deposit');
  }
  return json.data; // { metode, pay, pay_name, nominal, total_transfer, kode_unik, biaya_admin, expired_at, ... }
}

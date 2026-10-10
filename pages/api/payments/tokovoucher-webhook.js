// pages/api/payments/tokovoucher-webhook.js
// Callback dari TokoVoucher. Dokumentasi: https://docs.tokovoucher.net/webhook/post
import crypto from 'crypto';
import { supabaseAdmin } from '../../../lib/supabase';
import { refundSaldoOrder } from '../../../lib/refund';

// TokoVoucher menandatangani tiap callback lewat header
// X-TokoVoucher-Authorization = md5(MEMBER_CODE:SECRET:REF_ID).
// Tanpa pengecekan ini, siapa pun yang tahu URL webhook bisa memalsukan status pesanan.
function isAuthentic(req, refId) {
  if (process.env.TV_WEBHOOK_SKIP_AUTH === '1') return true; // pintu darurat kalau callback asli ikut ditolak
  const member = process.env.TOKOVOUCHER_MEMBER_CODE;
  const secret = process.env.TOKOVOUCHER_SECRET_KEY;
  if (!member || !secret) { console.warn('TV Webhook: kredensial TokoVoucher belum di-set, validasi dilewati'); return true; }

  const got = String(req.headers['x-tokovoucher-authorization'] || '');
  const expected = crypto.createHash('md5').update(`${member}:${secret}:${refId}`).digest('hex');
  if (got.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

// Notifikasi yang BUKAN callback transaksi (tidak ada ref_id), misalnya kabar deposit.
// Dokumentasi TokoVoucher tidak mendefinisikan formatnya, jadi di sini cuma DIREKAM apa adanya
// dan dicocokkan ke tiket deposit yang menunggu (hanya diberi tanda — saldo TIDAK ditambah otomatis).
async function captureOtherPayload(req, body) {
  let matched = null;
  try {
    const numbers = Object.values(body || {})
      .map((v) => parseInt(String(v).replace(/\D/g, ''), 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (numbers.length > 0) {
      const { data: pending } = await supabaseAdmin
        .from('deposits').select('id, total_transfer, nominal').eq('status', 'pending');
      const hits = (pending || []).filter((d) => numbers.includes(d.total_transfer));
      if (hits.length === 1) {
        matched = hits[0].id;
        await supabaseAdmin.from('deposits').update({ tv_notified_at: new Date().toISOString() }).eq('id', matched);
      }
    }
  } catch (e) {
    console.error('TV Webhook match deposit error:', e.message);
  }

  try {
    await supabaseAdmin.from('tv_webhook_logs').insert({ method: req.method, body: body || {}, matched_deposit: matched });
  } catch (e) {
    console.error('TV Webhook log error:', e.message);
  }
}

export default async function handler(req, res) {
  const body = (req.method === 'GET' ? req.query : req.body) || {};
  console.log('TV Webhook:', req.method, JSON.stringify(body));

  const { ref_id, status, sn, trx_id } = body;

  // Bukan callback transaksi -> rekam, jawab 200 supaya TokoVoucher tidak mengulang terus
  if (!ref_id) {
    await captureOtherPayload(req, body);
    return res.status(200).send('SUKSES');
  }

  if (!isAuthentic(req, ref_id)) {
    console.error('TV Webhook DITOLAK: header otorisasi tidak cocok, ref_id:', ref_id);
    return res.status(401).send('UNAUTHORIZED');
  }

  try {
    const statusLower = (status || '').toLowerCase();
    const newStatus = statusLower === 'sukses' ? 'success'
      : statusLower === 'gagal' ? 'failed'
      : 'processing';

    const { data: before } = await supabaseAdmin
      .from('orders').select('id, order_status').eq('ref_id', ref_id).maybeSingle();

    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        order_status: newStatus,
        tv_sn: sn || null,
        tv_trx_id: trx_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('ref_id', ref_id);

    if (error) console.error('TV Webhook update error:', error.message);

    if (before) {
      // Gagal & dibayar pakai saldo -> saldo dikembalikan (aman dari dobel)
      if (newStatus === 'failed') await refundSaldoOrder(before.id);

      // Baru berubah jadi sukses (bukan pengulangan callback) -> kirim kode voucher lewat WhatsApp
      if (newStatus === 'success' && before.order_status !== 'success') {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
          await fetch(`${baseUrl}/api/admin/whatsapp/notify-order`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: before.id }),
          });
        } catch (e) { console.error('WA notify trigger error:', e.message); }
      }
    }

    return res.status(200).send('SUKSES');
  } catch (err) {
    console.error(err);
    return res.status(500).send('ERROR');
  }
}

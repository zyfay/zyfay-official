// pages/api/akun/deposit.js — deposit saldo via Pakasir (QRIS / Virtual Account), konfirmasi otomatis
import { getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';
import { pakasir } from '../../../lib/pakasir';
import { PAYMENT_METHODS } from '../../../lib/paymentMethods';
import { settleDeposit } from '../../../lib/depositSettle';
import { MIN_DEPOSIT, MAX_DEPOSIT, MAX_PENDING_DEPOSITS, rupiah } from '../../../lib/akunConfig';

export default async function handler(req, res) {
  const customer = await getUnlockedCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Sesi berakhir, masukkan PIN lagi' });

  try {
    if (req.method === 'GET') {
      const { data: deposits } = await supabaseAdmin
        .from('deposits').select('*').eq('customer_id', customer.id)
        .order('created_at', { ascending: false }).limit(10);

      return res.json({
        success: true,
        min: MIN_DEPOSIT,
        max: MAX_DEPOSIT,
        methods: pakasir.isConfigured() ? PAYMENT_METHODS.map(({ code, label, type, desc }) => ({ id: code, name: label, type, desc })) : [],
        deposits: deposits || [],
      });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};

      // Cek status satu tiket ke Pakasir (dipakai halaman deposit selama menunggu pembayaran)
      if (action === 'check') {
        const { data: own } = await supabaseAdmin
          .from('deposits').select('id').eq('id', req.body.id).eq('customer_id', customer.id).maybeSingle();
        if (!own) return res.status(404).json({ success: false, message: 'Tiket tidak ditemukan' });
        const result = await settleDeposit(own.id);
        return res.json({ success: true, ...result });
      }

      // Batalkan tiket sendiri yang belum dibayar
      if (action === 'cancel') {
        const { data: dep } = await supabaseAdmin
          .from('deposits').select('id, txn_id').eq('id', req.body.id)
          .eq('customer_id', customer.id).eq('status', 'pending').maybeSingle();
        if (!dep) return res.status(400).json({ success: false, message: 'Tiket tidak bisa dibatalkan' });

        // Kalau ternyata sudah dibayar, jangan dibatalkan — selesaikan saja
        const settled = await settleDeposit(dep.id);
        if (settled.status === 'success') {
          return res.status(400).json({ success: false, message: 'Pembayaran ternyata sudah masuk, saldo sudah ditambahkan' });
        }
        if (dep.txn_id) { try { await pakasir.cancelTransaction(dep.txn_id); } catch (e) { console.error('cancel pakasir:', e.message); } }
        await supabaseAdmin.from('deposits').update({ status: 'cancelled' }).eq('id', dep.id).eq('status', 'pending');
        return res.json({ success: true });
      }

      // ---- Buat tiket baru ----
      if (!pakasir.isConfigured()) {
        return res.status(503).json({ success: false, message: 'Pembayaran belum tersedia saat ini' });
      }
      const nominal = parseInt(req.body.nominal, 10);
      const method = PAYMENT_METHODS.find((m) => m.code === req.body.method);

      if (!method) return res.status(400).json({ success: false, message: 'Metode pembayaran tidak valid' });
      if (!Number.isInteger(nominal) || nominal < MIN_DEPOSIT) {
        return res.status(400).json({ success: false, message: `Minimal deposit ${rupiah(MIN_DEPOSIT)}` });
      }
      if (nominal > MAX_DEPOSIT) {
        return res.status(400).json({ success: false, message: `Maksimal deposit ${rupiah(MAX_DEPOSIT)}` });
      }

      const { count } = await supabaseAdmin
        .from('deposits').select('id', { count: 'exact', head: true })
        .eq('customer_id', customer.id).eq('status', 'pending');
      if ((count || 0) >= MAX_PENDING_DEPOSITS) {
        return res.status(400).json({ success: false, message: 'Masih ada beberapa tiket deposit yang belum selesai. Selesaikan atau batalkan dulu.' });
      }

      const depositId = `DEP-${Date.now()}`;
      const pk = await pakasir.createTransaction({ method: method.code, orderId: depositId, amount: nominal });
      const tx = pk?.transaction || pk;
      if (!tx?.txn_id) {
        console.error('Pakasir deposit error:', JSON.stringify(pk));
        return res.status(502).json({ success: false, message: 'Gagal membuat pembayaran, coba lagi sebentar' });
      }

      const row = {
        id: depositId,
        customer_id: customer.id,
        nominal,
        total_transfer: tx.total_payment ?? nominal,
        biaya_admin: tx.fee ?? 0,
        kode_unik: 0,
        method_id: method.code,
        method_name: method.label,
        pay: tx.qr_string || tx.va_number || null,   // QRIS: string QR | VA: nomor VA
        pay_name: method.type === 'qris' ? 'QRIS' : method.bank || null,
        expired_at: tx.expired_at || null,
        txn_id: tx.txn_id,
        status: 'pending',
      };
      const { data: saved, error } = await supabaseAdmin.from('deposits').insert(row).select().single();
      if (error) {
        // Tiket sudah dibuat di Pakasir tapi gagal disimpan -> batalkan di Pakasir biar tidak menggantung
        try { await pakasir.cancelTransaction(tx.txn_id); } catch {}
        return res.status(500).json({ success: false, message: error.message });
      }

      return res.json({ success: true, deposit: saved });
    }

    return res.status(405).end();
  } catch (e) {
    console.error('akun/deposit error:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
}

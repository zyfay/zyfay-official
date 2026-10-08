// pages/api/akun/deposit.js — deposit saldo via tiket TokoVoucher (dikonfirmasi admin)
import { getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';
import { createTvDeposit } from '../../../lib/tvDeposit';
import { DEPOSIT_METHODS, MIN_DEPOSIT, MAX_DEPOSIT, MAX_PENDING_DEPOSITS, rupiah } from '../../../lib/akunConfig';

const configured = (m) => m.code && !String(m.code).startsWith('ISI_');

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
        // kode asli metode sengaja tidak dikirim ke browser
        methods: DEPOSIT_METHODS.filter(configured).map(({ id, name, desc }) => ({ id, name, desc })),
        deposits: deposits || [],
      });
    }

    if (req.method === 'POST') {
      const { action } = req.body || {};

      // Batalkan tiket sendiri yang belum dibayar
      if (action === 'cancel') {
        const { data: upd } = await supabaseAdmin
          .from('deposits').update({ status: 'cancelled' })
          .eq('id', req.body.id).eq('customer_id', customer.id).eq('status', 'pending').select('id');
        if (!upd || upd.length === 0) return res.status(400).json({ success: false, message: 'Tiket tidak bisa dibatalkan' });
        return res.json({ success: true });
      }

      const nominal = parseInt(req.body.nominal, 10);
      const method = DEPOSIT_METHODS.find((m) => m.id === req.body.method && configured(m));

      if (!method) return res.status(400).json({ success: false, message: 'Metode deposit belum tersedia' });
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

      const tv = await createTvDeposit({ nominal, kode: method.code });

      const row = {
        id: `DEP-${Date.now()}`,
        customer_id: customer.id,
        nominal,
        total_transfer: tv.total_transfer ?? nominal,
        kode_unik: tv.kode_unik ?? 0,
        biaya_admin: tv.biaya_admin ?? 0,
        method_id: method.id,
        method_name: tv.metode || method.name,
        pay: tv.pay || null,
        pay_name: tv.pay_name || null,
        expired_at: tv.expired_at || null,
        status: 'pending',
      };
      const { data: saved, error } = await supabaseAdmin.from('deposits').insert(row).select().single();
      if (error) return res.status(500).json({ success: false, message: error.message });

      return res.json({ success: true, deposit: saved });
    }

    return res.status(405).end();
  } catch (e) {
    console.error('akun/deposit error:', e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
}

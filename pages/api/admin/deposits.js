// pages/api/admin/deposits.js — admin: lihat tiket deposit, konfirmasi (isi saldo) atau batalkan
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';
import { creditBalance } from '../../../lib/balance';
import { sendViaFonnte } from '../../../lib/fonnte';
import { rupiah } from '../../../lib/akunConfig';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    if (req.method === 'GET') {
      const status = String(req.query.status || 'pending');
      let q = supabaseAdmin
        .from('deposits')
        .select('*, customers(name, email, phone)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (status !== 'all') q = q.eq('status', status);

      const { data, error } = await q;
      if (error) return res.status(500).json({ success: false, message: error.message });
      return res.json({ success: true, deposits: data || [] });
    }

    if (req.method === 'PATCH') {
      const { id, action } = req.body || {};
      if (!id || !['confirm', 'cancel'].includes(action)) {
        return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
      }

      if (action === 'cancel') {
        const { data: upd } = await supabaseAdmin
          .from('deposits').update({ status: 'cancelled' }).eq('id', id).eq('status', 'pending').select('id');
        if (!upd || upd.length === 0) return res.status(400).json({ success: false, message: 'Tiket sudah diproses sebelumnya' });
        return res.json({ success: true });
      }

      // Konfirmasi: "klaim" tiketnya dulu (hanya yang masih pending) supaya TIDAK mungkin kredit 2x
      const adminName = admin.username || admin.name || 'admin';
      const { data: claimed } = await supabaseAdmin
        .from('deposits')
        .update({ status: 'success', confirmed_by: adminName, confirmed_at: new Date().toISOString() })
        .eq('id', id).eq('status', 'pending')
        .select('id, customer_id, nominal');
      if (!claimed || claimed.length === 0) {
        return res.status(400).json({ success: false, message: 'Tiket sudah diproses sebelumnya' });
      }
      const dep = claimed[0];

      let balance;
      try {
        balance = await creditBalance(dep.customer_id, dep.nominal, { kind: 'deposit', adminName, note: `Deposit ${id}` });
      } catch (e) {
        // Gagal kredit -> kembalikan tiket ke pending biar bisa dicoba lagi
        await supabaseAdmin.from('deposits').update({ status: 'pending', confirmed_by: null, confirmed_at: null }).eq('id', id);
        return res.status(500).json({ success: false, message: 'Gagal menambah saldo: ' + e.message });
      }

      // Kabari customer lewat WhatsApp (kalau gagal, saldo tetap sudah masuk)
      try {
        const { data: c } = await supabaseAdmin.from('customers').select('phone').eq('id', dep.customer_id).single();
        if (c?.phone) {
          await sendViaFonnte(c.phone, `*Zyfay Official*\n\nDeposit ${rupiah(dep.nominal)} sudah masuk ke saldo kamu ✅\nSaldo sekarang: ${rupiah(balance)}`);
        }
      } catch (e) {
        console.error('Gagal kirim notif deposit:', e.message);
      }

      return res.json({ success: true, balance });
    }

    return res.status(405).end();
  } catch (e) {
    console.error('admin/deposits error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

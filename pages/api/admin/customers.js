// pages/api/admin/customers.js
// Kelola akun customer dari dashboard admin: lihat daftar, ubah saldo, reset PIN.
import { getAdmin } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    // --- Daftar customer (hash password & PIN TIDAK pernah dikirim ke browser) ---
    if (req.method === 'GET') {
      const q = String(req.query.q || '').trim();
      let query = supabaseAdmin
        .from('customers')
        .select('id, name, email, phone, balance, referral_code, pin_hash, is_verified, created_at')
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (q) {
        const safe = q.replace(/[%,()]/g, ' ');
        query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`);
      }

      const { data, error } = await query;
      if (error) return res.status(500).json({ success: false, message: error.message });

      const customers = (data || []).map(({ pin_hash, ...c }) => ({ ...c, has_pin: !!pin_hash }));
      return res.json({ success: true, customers });
    }

    // --- Aksi: ubah saldo / reset PIN ---
    if (req.method === 'PATCH') {
      const { id, action } = req.body || {};
      if (!id) return res.status(400).json({ success: false, message: 'id wajib diisi' });

      if (action === 'reset_pin') {
        const { error } = await supabaseAdmin
          .from('customers')
          .update({ pin_hash: null, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) return res.status(500).json({ success: false, message: error.message });
        return res.json({ success: true });
      }

      if (action === 'adjust_balance') {
        const amount = parseInt(req.body.amount, 10);
        const note = String(req.body.note || '').trim().slice(0, 200);
        if (!Number.isInteger(amount) || amount === 0) {
          return res.status(400).json({ success: false, message: 'Nominal harus angka bulat dan tidak boleh 0' });
        }
        if (Math.abs(amount) > 100000000) {
          return res.status(400).json({ success: false, message: 'Nominal terlalu besar' });
        }

        const { data: cust } = await supabaseAdmin.from('customers').select('balance').eq('id', id).single();
        if (!cust) return res.status(404).json({ success: false, message: 'Customer tidak ditemukan' });

        const current = cust.balance || 0;
        const next = current + amount;
        if (next < 0) {
          return res.status(400).json({ success: false, message: `Saldo gak cukup (saldo sekarang Rp${current.toLocaleString('id-ID')})` });
        }

        // Update hanya kalau saldo belum berubah sejak dibaca (cegah tabrakan 2 perubahan barengan)
        const { data: updated, error } = await supabaseAdmin
          .from('customers')
          .update({ balance: next, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('balance', current)
          .select('balance');
        if (error) return res.status(500).json({ success: false, message: error.message });
        if (!updated || updated.length === 0) {
          return res.status(409).json({ success: false, message: 'Saldo baru saja berubah, coba lagi' });
        }

        await supabaseAdmin.from('balance_logs').insert({
          customer_id: id, amount, balance_after: next, note: note || null, admin_name: admin.username || admin.name || 'admin',
        });

        return res.json({ success: true, balance: next });
      }

      return res.status(400).json({ success: false, message: 'Aksi tidak dikenal' });
    }

    return res.status(405).end();
  } catch (e) {
    console.error('admin/customers error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

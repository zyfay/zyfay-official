// pages/api/akun/profile.js — ubah nama & avatar
import { getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';
import { isValidAvatar } from '../../../lib/akunConfig';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();

  const customer = await getUnlockedCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Sesi berakhir, masukkan PIN lagi' });

  const { name, avatar } = req.body || {};
  const updates = {};

  if (name !== undefined) {
    const clean = String(name).trim().replace(/\s+/g, ' ');
    if (clean.length < 3 || clean.length > 30) {
      return res.status(400).json({ success: false, message: 'Nama harus 3-30 karakter' });
    }
    // Login bisa pakai nama, jadi nama gak boleh kembar sama akun lain
    const { data: taken } = await supabaseAdmin
      .from('customers').select('id').ilike('name', clean).neq('id', customer.id).limit(1);
    if (taken && taken.length > 0) {
      return res.status(400).json({ success: false, message: 'Nama itu sudah dipakai akun lain' });
    }
    updates.name = clean;
  }

  if (avatar !== undefined) {
    if (!isValidAvatar(avatar)) return res.status(400).json({ success: false, message: 'Avatar tidak valid' });
    updates.avatar = avatar;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'Tidak ada yang diubah' });
  }

  updates.updated_at = new Date().toISOString();
  const { error } = await supabaseAdmin.from('customers').update(updates).eq('id', customer.id);
  if (error) return res.status(500).json({ success: false, message: error.message });

  return res.json({ success: true, ...updates });
}

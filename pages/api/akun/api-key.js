// pages/api/akun/api-key.js — API key Zyfay milik customer (1 akun = 1 key aktif)
import crypto from 'crypto';
import { getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  const customer = await getUnlockedCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Sesi berakhir, masukkan PIN lagi' });

  try {
    // Info key: key lengkap TIDAK dikirim lagi, cuma versi tersamar
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('api_keys').select('id, key, is_active, created_at, last_used_at')
        .eq('customer_id', customer.id).order('created_at', { ascending: false }).limit(1);
      if (error) return res.status(500).json({ success: false, message: error.message });

      const k = data?.[0];
      if (!k) return res.json({ success: true, hasKey: false });
      return res.json({
        success: true, hasKey: true,
        masked: `${k.key.slice(0, 10)}••••••••${k.key.slice(-4)}`,
        is_active: k.is_active, created_at: k.created_at, last_used_at: k.last_used_at,
      });
    }

    // Buat / buat ulang: key lama langsung mati, key baru ditampilkan SEKALI
    if (req.method === 'POST') {
      await supabaseAdmin.from('api_keys').delete().eq('customer_id', customer.id);

      const key = 'zyfay_' + crypto.randomBytes(24).toString('hex');
      const { error } = await supabaseAdmin
        .from('api_keys').insert({ label: `Customer: ${customer.name}`, key, customer_id: customer.id });
      if (error) return res.status(500).json({ success: false, message: error.message });

      return res.json({ success: true, key });
    }

    return res.status(405).end();
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

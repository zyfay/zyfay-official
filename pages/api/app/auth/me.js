// GET /api/app/auth/me
// header: x-api-key + Authorization: Bearer <token>
// Saldo & no HP sengaja TIDAK dikirim (di web juga dikunci PIN).
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyApiKey } from '../../../../lib/apiAuth';
import { getAppCustomer } from '../../../../lib/appAuth';
import { DEFAULT_AVATAR } from '../../../../lib/akunConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const me = await getAppCustomer(req);
  if (!me) return res.status(401).json({ success: false, message: 'Belum login atau token kedaluwarsa' });

  const { data: row } = await supabaseAdmin
    .from('customers').select('id, name, email, avatar, pin_hash, referral_code, is_verified').eq('id', me.id).single();
  if (!row || !row.is_verified) return res.status(401).json({ success: false, message: 'Akun tidak ditemukan' });

  return res.json({
    success: true,
    user: { id: row.id, name: row.name, email: row.email, avatar: row.avatar || DEFAULT_AVATAR, hasPin: !!row.pin_hash, referral_code: row.referral_code },
  });
}

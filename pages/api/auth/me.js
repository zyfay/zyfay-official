// pages/api/auth/me.js
import { getCustomer, getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const customer = await getCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Belum login' });

  const { data: row } = await supabaseAdmin
    .from('customers')
    .select('name, email, phone, balance, pin_hash, referral_code')
    .eq('id', customer.id)
    .single();

  const unlocked = await getUnlockedCustomer(req);

  return res.json({
    success: true,
    name: row.name,
    email: row.email,
    hasPin: !!row.pin_hash,
    isUnlocked: !!unlocked,
    // Saldo & data sensitif cuma dibocorin kalau PIN udah diverifikasi
    balance: unlocked ? row.balance : null,
    phone: unlocked ? row.phone : null,
    referral_code: unlocked ? row.referral_code : null,
  });
}

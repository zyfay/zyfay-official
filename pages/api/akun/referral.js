// pages/api/akun/referral.js — statistik referral milik customer
import { getUnlockedCustomer } from '../../../lib/customerAuth';
import { supabaseAdmin } from '../../../lib/supabase';
import { REFERRAL_BONUS } from '../../../lib/akunConfig';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const customer = await getUnlockedCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Sesi berakhir, masukkan PIN lagi' });

  const { data: me } = await supabaseAdmin.from('customers').select('referral_code').eq('id', customer.id).single();

  const { count } = await supabaseAdmin
    .from('customers').select('id', { count: 'exact', head: true })
    .eq('referred_by', customer.id).eq('is_verified', true);

  const { data: logs } = await supabaseAdmin
    .from('balance_logs').select('amount').eq('customer_id', customer.id).eq('kind', 'referral');
  const totalBonus = (logs || []).reduce((sum, l) => sum + (l.amount > 0 ? l.amount : 0), 0);

  return res.json({
    success: true,
    code: me?.referral_code || null,
    invited: count || 0,
    totalBonus,
    bonusPerInvite: REFERRAL_BONUS,
  });
}

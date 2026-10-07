// pages/api/auth/pin/verify.js
import { getCustomer, signCustomerToken } from '../../../../lib/customerAuth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { buildCookie } from '../../../../lib/cookieHelper';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const customer = await getCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Silakan login dulu' });

  const { pin } = req.body || {};
  if (!/^\d{6}$/.test(pin || '')) {
    return res.status(400).json({ success: false, message: 'PIN harus 6 digit' });
  }

  const { data: row } = await supabaseAdmin.from('customers').select('pin_hash').eq('id', customer.id).single();
  if (!row?.pin_hash) return res.status(400).json({ success: false, message: 'Belum ada PIN, silakan buat dulu' });

  const valid = await bcrypt.compare(pin, row.pin_hash);
  if (!valid) return res.status(400).json({ success: false, message: 'PIN salah' });

  const unlockToken = await signCustomerToken({ id: customer.id, role: 'customer_unlocked' });
  res.setHeader('Set-Cookie', buildCookie('customer_pin_unlock', unlockToken, { maxAge: 60 * 60 * 2 }));

  return res.json({ success: true });
}

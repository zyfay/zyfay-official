// pages/api/auth/pin/setup.js
import { getCustomer } from '../../../../lib/customerAuth';
import { supabaseAdmin } from '../../../../lib/supabase';
import { signCustomerToken } from '../../../../lib/customerAuth';
import { buildCookie } from '../../../../lib/cookieHelper';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const customer = await getCustomer(req);
  if (!customer) return res.status(401).json({ success: false, message: 'Silakan login dulu' });

  const { pin } = req.body || {};
  if (!/^\d{6}$/.test(pin || '')) {
    return res.status(400).json({ success: false, message: 'PIN harus 6 digit angka' });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  await supabaseAdmin.from('customers').update({ pin_hash: pinHash, updated_at: new Date().toISOString() }).eq('id', customer.id);

  // Langsung "unlock" juga abis bikin PIN baru, gak perlu re-input
  const unlockToken = await signCustomerToken({ id: customer.id, role: 'customer_unlocked' });
  res.setHeader('Set-Cookie', buildCookie('customer_pin_unlock', unlockToken, { maxAge: 60 * 60 * 2 })); // 2 jam

  return res.json({ success: true });
}

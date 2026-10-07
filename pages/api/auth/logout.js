// pages/api/auth/logout.js
import { clearCookie } from '../../../lib/cookieHelper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Set-Cookie', [clearCookie('customer_token'), clearCookie('customer_pin_unlock')]);
  return res.json({ success: true });
}

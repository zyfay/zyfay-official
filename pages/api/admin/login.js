// pages/api/admin/login.js
import { signToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password } = req.body;
  if (
    username !== (process.env.ADMIN_USERNAME || 'admin') ||
    password !== (process.env.ADMIN_PASSWORD || 'admin123')
  ) {
    return res.status(401).json({ success: false, message: 'Username atau password salah' });
  }
  const token = await signToken({ username, role: 'admin' });
  res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`);
  return res.json({ success: true, token });
}

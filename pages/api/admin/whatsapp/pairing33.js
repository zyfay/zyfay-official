// pages/api/admin/whatsapp/pairing.js
import { getAdmin } from '../../../../lib/auth';
import { startPairing } from '../../../../lib/whatsappBot';

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).end();

  const { phone } = req.body || {};
  if (!phone?.trim()) return res.status(400).json({ success: false, message: 'Nomor HP wajib diisi' });

  res.writeHead(200, {
    'Content-Type': 'application/x-ndjson',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    await startPairing(phone.trim(), (code) => {
      res.write(JSON.stringify({ type: 'code', code }) + '\n');
    });
    res.write(JSON.stringify({ type: 'success' }) + '\n');
  } catch (e) {
    res.write(JSON.stringify({ type: 'error', message: e.message }) + '\n');
  } finally {
    res.end();
  }
}

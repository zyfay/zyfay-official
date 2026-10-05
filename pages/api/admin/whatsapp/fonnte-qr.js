// pages/api/admin/whatsapp/fonnte-qr.js
import { getAdmin } from '../../../../lib/auth';

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const resp = await fetch('https://api.fonnte.com/qr', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN },
    });
    const data = await resp.json();

    if (!data.status) {
      // "device already connect" juga masuk sini, itu bukan error sebenarnya
      return res.json({ success: false, message: data.reason || 'Gagal ambil QR' });
    }

    return res.json({ success: true, qr: data.url || data.qr || null, raw: data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

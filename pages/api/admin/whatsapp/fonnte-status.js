// pages/api/admin/whatsapp/fonnte-status.js
import { getAdmin } from '../../../../lib/auth';

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (!FONNTE_TOKEN) {
    return res.status(500).json({ success: false, message: 'FONNTE_TOKEN belum di-set di environment variable Vercel' });
  }

  try {
    const resp = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN },
    });

    // Kalau Fonnte balikin HTTP error (misal 429 rate limit), tangkep body-nya
    // dulu sebelum di-parse, biar pesan errornya jelas bukan cuma "fetch failed".
    const rawText = await resp.text();
    let data;
    try { data = JSON.parse(rawText); } catch {
      return res.status(502).json({ success: false, message: `Fonnte balikin respons non-JSON (HTTP ${resp.status}): ${rawText.slice(0, 150)}` });
    }

    if (!data.status) {
      return res.status(400).json({ success: false, message: data.reason || `Gagal ambil status (HTTP ${resp.status})` });
    }

    return res.json({
      success: true,
      device: data.device,
      status: data.device_status, // 'connect' | 'disconnect'
      name: data.name,
      quota: data.quota,
      expired: data.expired,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: `Fetch ke Fonnte gagal: ${e.message}` });
  }
}

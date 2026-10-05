// pages/api/admin/whatsapp/fonnte-status.js
import { getAdmin } from '../../../../lib/auth';

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const resp = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN },
    });
    const data = await resp.json();
    if (!data.status) return res.status(400).json({ success: false, message: data.reason || 'Gagal ambil status' });

    return res.json({
      success: true,
      device: data.device,
      status: data.device_status, // 'connect' | 'disconnect'
      name: data.name,
      quota: data.quota,
      expired: data.expired,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

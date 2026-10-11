// pages/api/admin/whatsapp/fonnte-qr.js
// Ambil QR connect dari Fonnte (https://docs.fonnte.com/api-get-qr/).
// Fonnte membalas kolom "url" berisi base64 MENTAH ("iVBORw0KGgo..."), bukan alamat gambar,
// jadi di sini diubah dulu jadi data URL supaya bisa langsung dipakai di <img src>.
import { getAdmin } from '../../../../lib/auth';

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

function toImageSrc(raw) {
  if (!raw || typeof raw !== 'string') return null;
  if (raw.startsWith('data:') || raw.startsWith('http')) return raw; // sudah siap pakai
  return `data:image/png;base64,${raw}`;
}

export default async function handler(req, res) {
  const admin = await getAdmin(req);
  if (!admin) return res.status(401).json({ success: false, message: 'Unauthorized' });

  if (!FONNTE_TOKEN) {
    return res.status(500).json({ success: false, message: 'FONNTE_TOKEN belum di-set di environment variable Vercel' });
  }

  try {
    const resp = await fetch('https://api.fonnte.com/qr', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ type: 'qr' }),
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch {
      return res.status(502).json({ success: false, message: `Fonnte membalas format tak dikenal (HTTP ${resp.status})` });
    }

    const qr = toImageSrc(data.url || data.qr);
    if (qr) return res.json({ success: true, qr });

    // Tidak ada QR: biasanya "device already connect" (bukan error sebenarnya) atau batas permintaan
    const reason = data.reason || 'Fonnte tidak mengirim QR';
    return res.json({
      success: false,
      alreadyConnected: /already connect/i.test(reason),
      message: /already connect/i.test(reason) ? 'Device sudah terhubung, QR tidak diperlukan' : reason,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: `Fetch ke Fonnte gagal: ${e.message}` });
  }
}

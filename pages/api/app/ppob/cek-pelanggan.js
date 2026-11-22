// pages/api/app/ppob/cek-pelanggan.js
// POST /api/app/ppob/cek-pelanggan   body: { type, number }
//
// Cek nama pelanggan SEBELUM bayar. Keadaan sebenarnya:
//  - Pascabayar (PLN pasca, PDAM, BPJS, internet): namanya ikut di /api/app/ppob/inquiry (customer_name).
//  - Token PLN & e-wallet (DANA/OVO/GoPay/ShopeePay): TokoVoucher TIDAK menyediakan API cek nama,
//    jadi di sini dijawab supported:false (sama seperti /api/app/cekid-game untuk game yang belum didukung;
//    aplikasi tinggal menyembunyikan tombol "Cek nama"). Kalau nanti lo berlangganan penyedia cek nama,
//    sambungkan di fungsi lookupName() di bawah.
import { verifyApiKey } from '../../../../lib/apiAuth';

const TYPES = ['pln-token', 'ewallet', 'pascabayar'];

async function lookupName(/* type, number, provider */) {
  return null; // belum ada penyedia yang tersambung
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { type, number } = req.body || {};
  const no = String(number ?? '').trim();
  if (!TYPES.includes(type)) return res.status(400).json({ success: false, message: `type harus salah satu dari: ${TYPES.join(', ')}` });
  if (!/^[0-9]{4,20}$/.test(no)) return res.status(400).json({ success: false, message: 'Nomor tidak valid' });

  if (type === 'pascabayar') {
    return res.json({ success: false, supported: false, use: '/api/app/ppob/inquiry', message: 'Nama pelanggan pascabayar tampil di hasil cek tagihan' });
  }

  const name = await lookupName(type, no);
  if (name) return res.json({ success: true, supported: true, name });
  return res.json({ success: false, supported: false, message: 'Cek nama untuk layanan ini belum tersedia' });
}

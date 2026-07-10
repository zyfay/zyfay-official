// pages/api/cekid-game/index.js
import { getNicknameGameConfig } from '../../../lib/nicknameGames';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { game_id, user_id, server_id } = req.body || {};
  if (!game_id || !user_id) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  const config = getNicknameGameConfig(game_id);
  if (!config) {
    // Game ini belum ada di daftar dukungan cek ID otomatis — bukan error,
    // cuma memang belum tersedia. Front-end akan sembunyikan tombolnya.
    return res.json({ success: false, supported: false });
  }

  if (config.needsServer && !server_id) {
    return res.json({ success: false, supported: true, message: 'Server/Zone ID wajib diisi dulu' });
  }

  try {
    let url = `https://api.isan.eu.org/nickname/${config.code}?id=${encodeURIComponent(user_id)}`;
    if (config.needsServer) url += `&server=${encodeURIComponent(server_id)}`;

    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();

    if (data?.success && data?.name) {
      return res.json({ success: true, supported: true, name: data.name });
    }
    return res.json({ success: false, supported: true, message: 'ID tidak ditemukan, periksa lagi ID kamu' });
  } catch (e) {
    console.error('Nickname check error:', e.message);
    return res.json({ success: false, supported: true, message: 'Gagal memeriksa ID, coba lagi sebentar' });
  }
    }

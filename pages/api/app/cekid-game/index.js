// pages/api/app/cekid-game/index.js
import { getNicknameGameConfig } from '../../../../lib/nicknameGames';
import { verifyApiKey } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await verifyApiKey(req))) return res.status(401).json({ success: false, message: 'API key tidak valid' });

  const { game_id, user_id, server_id } = req.body || {};
  if (!game_id || !user_id) return res.status(400).json({ success: false, message: 'Data tidak lengkap' });

  const config = getNicknameGameConfig(game_id);
  if (!config) return res.json({ success: false, supported: false });
  if (config.needsServer && !server_id) {
    return res.json({ success: false, supported: true, message: 'Server/Zone ID wajib diisi dulu' });
  }

  try {
    let url = `https://api.isan.eu.org/nickname/${config.code}?id=${encodeURIComponent(user_id)}`;
    if (config.needsServer) url += `&server=${encodeURIComponent(server_id)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    if (data?.success && data?.name) return res.json({ success: true, supported: true, name: data.name });
    return res.json({ success: false, supported: true, message: 'ID tidak ditemukan' });
  } catch (e) {
    return res.json({ success: false, supported: true, message: 'Gagal memeriksa ID' });
  }
}

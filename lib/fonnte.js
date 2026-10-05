// lib/fonnte.js
const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

export async function sendViaFonnte(target, message) {
  const resp = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: FONNTE_TOKEN,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ target, message }),
  });
  const data = await resp.json();
  if (!data.status) throw new Error(data.reason || 'Gagal kirim lewat Fonnte');
  return data;
}

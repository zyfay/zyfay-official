// lib/whatsappBot.js
import makeWASocket, { Browsers, DisconnectReason } from 'baileys';
import { useSupabaseAuthState, clearAuthState } from './waAuthState';
import { supabaseAdmin } from './supabase';

function toJid(phone) {
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  if (!p.startsWith('62')) p = '62' + p;
  return `${p}@s.whatsapp.net`;
}

// Buka koneksi baru & minta pairing code. Dipanggil sekali pas admin
// nyambungin nomor pertama kali dari dashboard.
export async function startPairing(phone, onCode) {
  await clearAuthState(); // pairing baru = mulai bersih
  const { state, saveCreds } = await useSupabaseAuthState();

  return new Promise((resolve, reject) => {
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
    });

    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('Waktu pairing habis, coba lagi')); }
    }, 45000);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open' && !settled) {
        settled = true;
        clearTimeout(timeout);
        await supabaseAdmin.from('whatsapp_bot').update({
          status: 'connected', phone, connected_at: new Date().toISOString(),
        }).eq('id', 1);
        resolve(true);
      }
      if (connection === 'close' && !settled) {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code !== DisconnectReason.restartRequired) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error('Koneksi WhatsApp terputus, coba pairing ulang'));
        }
      }
    });

    // Minta pairing code setelah socket siap
    setTimeout(async () => {
      try {
        if (!sock.authState.creds.registered) {
          const code = await sock.requestPairingCode(phone.replace(/\D/g, ''));
          onCode(code);
        }
      } catch (e) {
        if (!settled) { settled = true; clearTimeout(timeout); reject(e); }
      }
    }, 3000);
  });
}

// Connect pake sesi yang udah tersimpan, kirim satu pesan, lalu putus.
// Dipanggil tiap ada transaksi sukses — TIDAK menyimpan koneksi nyala terus.
export async function sendWhatsAppMessage(phone, message) {
  const { state, saveCreds } = await useSupabaseAuthState();

  if (!state.creds.registered) {
    throw new Error('Bot WhatsApp belum di-pairing');
  }

  const sock = makeWASocket({ auth: state, printQRInTerminal: false, browser: Browsers.ubuntu('Chrome') });
  sock.ev.on('creds.update', saveCreds);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout koneksi WhatsApp')), 20000);
    sock.ev.on('connection.update', (u) => {
      if (u.connection === 'open') { clearTimeout(timeout); resolve(); }
      if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.restartRequired) {
        clearTimeout(timeout);
        reject(new Error('Gagal konek WhatsApp'));
      }
    });
  });

  await sock.sendMessage(toJid(phone), { text: message });
  await new Promise((r) => setTimeout(r, 1500)); // kasih waktu kekirim beneran
  sock.end();
}

export async function disconnectBot() {
  await clearAuthState();
  await supabaseAdmin.from('whatsapp_bot').update({ status: 'disconnected', phone: null, connected_at: null }).eq('id', 1);
}

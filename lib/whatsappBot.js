// lib/whatsappBot.js
//
// Semua pengiriman WA sekarang lewat Fonnte (bukan Baileys self-host lagi).
// Kode Baileys lama dibuang total — gak perlu pairing/sesi sendiri, gak ada
// lagi masalah "muter terus" pas pairing gagal, karena koneksi WA-nya
// dipegang sama Fonnte, bukan server kita.
import { supabaseAdmin } from './supabase';

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

// Dipanggil tiap ada transaksi sukses (notify-order.js) — nama fungsi & signature
// sengaja dipertahankan sama supaya caller lama gak perlu diubah.
export async function sendWhatsAppMessage(phone, message) {
  try {
    const resp = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ target: phone, message }),
    });
    const data = await resp.json();
    if (!data.status) throw new Error(data.reason || 'Gagal kirim lewat Fonnte');

    await supabaseAdmin.from('whatsapp_messages').insert({ phone, message, status: 'sent' });
  } catch (e) {
    await supabaseAdmin.from('whatsapp_messages').insert({ phone, message, status: 'failed', error: e.message });
    throw e; // tetap lempar biar caller (notify-order.js) tau gagal
  }
}

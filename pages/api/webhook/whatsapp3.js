// pages/api/webhook/whatsapp.js
//
// Webhook ini dipanggil otomatis sama Fonnte tiap ada pesan WA masuk.
// Jalan di Vercel biasa (bukan koneksi nyala terus), karena Fonnte yang
// nyimpen koneksi WA-nya di server mereka dan nge-POST ke sini tiap ada pesan.
//
// Setup di dashboard Fonnte:
//   Webhook URL -> https://domainkamu.com/api/webhook/whatsapp
//
// Env var yang perlu ditambah di Vercel:
//   FONNTE_TOKEN = token device dari dashboard Fonnte

import { supabaseAdmin } from '../../../lib/supabase';

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // Format payload Fonnte: { sender, message, ... } — cek dokumentasi Fonnte
    // kalau field-nya beda pas kamu test beneran, tinggal sesuaikan di sini.
    const { sender, message } = req.body || {};
    if (!sender || !message) return res.status(200).json({ success: true }); // ignore payload gak lengkap

    const text = String(message).trim().toLowerCase();

    const { data: rules } = await supabaseAdmin
      .from('whatsapp_autoreply')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const matched = (rules || []).find((r) =>
      r.match_type === 'contains' ? text.includes(r.keyword) : text === r.keyword
    );

    // Catat pesan masuk ke log (biar keliatan juga di dashboard)
    await supabaseAdmin.from('whatsapp_messages').insert({
      phone: sender,
      message: `[MASUK] ${message}`,
      status: 'sent',
    });

    if (matched) {
      await sendViaFonnte(sender, matched.reply);
      await supabaseAdmin.from('whatsapp_messages').insert({
        phone: sender,
        message: `[AUTO-REPLY] ${matched.reply}`,
        status: 'sent',
      });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Webhook WA error:', e);
    return res.status(200).json({ success: false, message: e.message }); // tetep 200 biar Fonnte gak retry terus
  }
}

async function sendViaFonnte(target, message) {
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

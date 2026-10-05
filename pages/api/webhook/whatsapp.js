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
import { sendViaFonnte } from '../../../lib/fonnte';

const SITE_URL = 'https://zyfay-official.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { sender, message } = req.body || {};
    if (!sender || !message) return res.status(200).json({ success: true });

    const rawText = String(message).trim();
    const text = rawText.toLowerCase();
    const waSessionId = `wa_${sender.replace(/\D/g, '')}`; // dipakai bareng sama live chat di web

    await supabaseAdmin.from('whatsapp_messages').insert({
      phone: sender,
      message: `[MASUK] ${message}`,
      status: 'sent',
    });

    // --- Cek dulu: apakah chat ini lagi di-handle manual sama admin (live chat)? ---
    const { data: existingSession } = await supabaseAdmin
      .from('chat_sessions')
      .select('id, status')
      .eq('id', waSessionId)
      .maybeSingle();

    const isHandedOffToAdmin = existingSession && ['waiting', 'active'].includes(existingSession.status);

    // --- Trigger "cs": mulai/lanjutkan sesi live chat, teruskan ke admin ---
    if (text === 'cs' || isHandedOffToAdmin) {
      await supabaseAdmin.from('chat_sessions').upsert({
        id: waSessionId,
        user_name: `WA ${sender}`,
        status: 'waiting',
        last_message: rawText,
        last_message_at: new Date().toISOString(),
      }, { onConflict: 'id' });

      await supabaseAdmin.from('chat_messages').insert({
        session_id: waSessionId,
        sender: 'user',
        text: rawText,
        message_type: 'text',
      });

      // Cuma kasih notif pembuka sekali, pas baru mulai (bukan tiap pesan susulan)
      if (text === 'cs' && !isHandedOffToAdmin) {
        const reply = 'Oke, chat kamu udah masuk ke admin kami ya. Mohon ditunggu, admin akan segera membalas di sini 🙏';
        await sendViaFonnte(sender, reply);
        await supabaseAdmin.from('whatsapp_messages').insert({ phone: sender, message: `[AUTO-REPLY] ${reply}`, status: 'sent' });
      }

      return res.status(200).json({ success: true });
    }

    let reply = null;

    // --- Dynamic: "harga" / "harga <game>" — ambil langsung dari Supabase ---
    if (text === 'harga' || text.startsWith('harga ')) {
      reply = await buildHargaReply(text);
    }

    // --- Fallback: static auto-reply rules yang dikelola dari dashboard admin ---
    if (!reply) {
      const { data: rules } = await supabaseAdmin
        .from('whatsapp_autoreply')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const matched = (rules || []).find((r) =>
        r.match_type === 'contains' ? text.includes(r.keyword) : text === r.keyword
      );
      if (matched) reply = matched.reply;
    }

    if (reply) {
      await sendViaFonnte(sender, reply);
      await supabaseAdmin.from('whatsapp_messages').insert({
        phone: sender,
        message: `[AUTO-REPLY] ${reply}`,
        status: 'sent',
      });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Webhook WA error:', e);
    return res.status(200).json({ success: false, message: e.message }); // tetep 200 biar Fonnte gak retry terus
  }
}

async function buildHargaReply(text) {
  if (text === 'harga') {
    const { data: games } = await supabaseAdmin
      .from('games')
      .select('id, name')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(15);

    if (!games || games.length === 0) {
      return `Belum ada game tersedia saat ini. Cek langsung di ${SITE_URL}`;
    }

    const list = games.map((g) => `• ${g.name}`).join('\n');
    return `Ketik *harga <nama game>* buat cek daftar harga. Contoh: *harga mlbb*\n\nGame tersedia:\n${list}`;
  }

  const query = text.replace(/^harga\s+/, '').trim();
  if (!query) return null;

  const { data: games } = await supabaseAdmin
    .from('games')
    .select('id, name')
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .limit(1);

  const game = games?.[0];
  if (!game) {
    return `Game "${query}" gak ketemu. Ketik *harga* buat liat daftar game yang tersedia, atau cek langsung di ${SITE_URL}`;
  }

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('name, price')
    .eq('game_id', game.id)
    .eq('is_active', true)
    .order('price', { ascending: true })
    .limit(20);

  if (!products || products.length === 0) {
    return `Produk buat ${game.name} belum tersedia. Cek langsung di ${SITE_URL}`;
  }

  const list = products
    .map((p) => `• ${p.name} — Rp${p.price.toLocaleString('id-ID')}`)
    .join('\n');

  return `*Daftar Harga ${game.name}*\n\n${list}\n\nOrder langsung: ${SITE_URL}/topup/${game.id}`;
}

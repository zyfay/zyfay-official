// pages/api/admin/whatsapp/notify-order.js
import { sendWhatsAppMessage } from '../../../../lib/whatsappBot';
import { supabaseAdmin } from '../../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { order_id } = req.body || {};
  if (!order_id) return res.status(400).json({ success: false, message: 'order_id wajib diisi' });

  try {
    // Catatan: cek status "whatsapp_bot" (peninggalan sistem Baileys lama) udah
    // dibuang — sekarang pengiriman lewat Fonnte, status koneksinya dicek
    // langsung di dashboard admin (fonnte-status.js), bukan dari tabel ini.
    const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', order_id).single();
    if (!order) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

    const phone = order.form_data?.phone || order.form_data?.user_id;
    if (!phone) {
      return res.json({ success: false, message: 'Nomor HP pembeli tidak tersedia' });
    }

    let message = `Halo! Pesanan kamu di *Zyfay Official* sudah berhasil ✅\n\n`;
    message += `ID Pesanan: ${order.id}\n`;
    message += `Produk: ${order.product_name}\n`;

    if (order.tv_sn) {
      // Kode voucher ditaro paling nonjol sendiri, biar gampang di-copy dari WA
      message += `\n━━━━━━━━━━━━━━\n`;
      message += `🎟️ *KODE VOUCHER KAMU*\n`;
      message += `\`${order.tv_sn}\`\n`; // WA format monospace: 1 backtick, bukan 3 (bukan markdown biasa)
      message += `━━━━━━━━━━━━━━\n`;
      message += `\n_Tap & tahan kode di atas buat copy._\n`;
    } else {
      message += `\nStatus: sedang diproses, kode voucher menyusul ya 🙏\n`;
    }

    message += `\nButuh bantuan? Ketik *cs*\nTerima kasih sudah belanja di Zyfay! 🙏`;

    await sendWhatsAppMessage(phone, message);
    return res.json({ success: true });
  } catch (e) {
    console.error('WA notify error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

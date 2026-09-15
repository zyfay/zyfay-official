// pages/api/whatsapp/notify-order.js
import { sendWhatsAppMessage } from '../../../lib/whatsappBot';
import { supabaseAdmin } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { order_id } = req.body || {};
  if (!order_id) return res.status(400).json({ success: false, message: 'order_id wajib diisi' });

  try {
    const { data: bot } = await supabaseAdmin.from('whatsapp_bot').select('*').eq('id', 1).single();
    if (bot?.status !== 'connected') {
      return res.json({ success: false, message: 'Bot WhatsApp belum terhubung, notif dilewati' });
    }

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
      message += `\nKode/Voucher kamu:\n*${order.tv_sn}*\n`;
    }
    message += `\nCek detail lengkap: cek pesanan di web kami dengan ID di atas.\nTerima kasih sudah belanja di Zyfay! 🙏`;

    await sendWhatsAppMessage(phone, message);
    return res.json({ success: true });
  } catch (e) {
    console.error('WA notify error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

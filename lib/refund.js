// lib/refund.js
import { supabaseAdmin } from './supabase';
import { creditBalance } from './balance';

// Aman dipanggil berkali-kali: kolom saldo_refunded "diklaim" dulu secara atomik,
// jadi satu pesanan cuma bisa dikembalikan sekali walau webhook datang berulang.
export async function refundSaldoOrder(orderId) {
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, payment_method, customer_id, product_price, order_status, saldo_refunded')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.payment_method !== 'saldo' || !order.customer_id) return false;
  if (order.order_status !== 'failed' || order.saldo_refunded) return false;

  const { data: claimed } = await supabaseAdmin
    .from('orders').update({ saldo_refunded: true })
    .eq('id', orderId).eq('saldo_refunded', false).select('id');
  if (!claimed || claimed.length === 0) return false;

  try {
    await creditBalance(order.customer_id, order.product_price, {
      kind: 'refund', adminName: 'sistem', note: `Pengembalian pesanan ${orderId}`,
    });
    return true;
  } catch (e) {
    // Gagal mengembalikan -> lepas klaim supaya bisa dicoba lagi
    await supabaseAdmin.from('orders').update({ saldo_refunded: false }).eq('id', orderId);
    console.error('Refund saldo gagal:', orderId, e.message);
    return false;
  }
}

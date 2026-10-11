// lib/depositSettle.js
// Satu-satunya jalur yang boleh menambah saldo dari deposit Pakasir.
// Status pembayaran SELALU dicek langsung ke API Pakasir memakai txn_id yang tersimpan di database kita
// (bukan angka dari isi webhook/browser), jadi tidak bisa dipalsukan.
import { supabaseAdmin } from './supabase';
import { pakasir } from './pakasir';
import { creditBalance } from './balance';
import { sendViaFonnte } from './fonnte';
import { rupiah } from './akunConfig';

export async function settleDeposit(depositId) {
  const { data: dep } = await supabaseAdmin.from('deposits').select('*').eq('id', depositId).maybeSingle();
  if (!dep) return { status: 'not_found' };
  if (dep.status !== 'pending') return { status: dep.status }; // sudah selesai/batal, jangan diproses lagi
  if (!dep.txn_id) return { status: 'pending', note: 'Tiket ini tidak punya ID transaksi Pakasir' };

  let detail;
  try {
    const raw = await pakasir.getTransactionStatus(dep.txn_id);
    detail = raw?.transaction || raw;
  } catch (e) {
    console.error('settleDeposit: gagal cek ke Pakasir:', e.message);
    return { status: 'pending', note: 'Gagal menghubungi Pakasir, coba lagi sebentar' };
  }

  // Pakasir bilang dibatalkan/kedaluwarsa -> tutup tiketnya
  if (detail?.status === 'canceled') {
    await supabaseAdmin.from('deposits').update({ status: 'cancelled' }).eq('id', dep.id).eq('status', 'pending');
    return { status: 'cancelled' };
  }
  if (detail?.status !== 'completed') return { status: 'pending' };

  // Pengaman: nominal yang dibayar harus sama dengan tiket kita
  if (detail.amount !== undefined && Number(detail.amount) !== Number(dep.nominal)) {
    console.error('settleDeposit: nominal tidak cocok', dep.id, detail.amount, dep.nominal);
    return { status: 'pending', note: 'Nominal pembayaran tidak cocok, hubungi admin' };
  }
  if (detail.order_id !== undefined && detail.order_id !== dep.id) {
    console.error('settleDeposit: order_id tidak cocok', dep.id, detail.order_id);
    return { status: 'pending', note: 'Data pembayaran tidak cocok, hubungi admin' };
  }

  // "Klaim" tiketnya dulu (hanya yang masih pending) -> mustahil menambah saldo dua kali
  const { data: claimed } = await supabaseAdmin
    .from('deposits')
    .update({ status: 'success', confirmed_by: 'pakasir', confirmed_at: new Date().toISOString() })
    .eq('id', dep.id).eq('status', 'pending')
    .select('id');
  if (!claimed || claimed.length === 0) return { status: 'success', already: true };

  let balance;
  try {
    balance = await creditBalance(dep.customer_id, dep.nominal, {
      kind: 'deposit', adminName: 'pakasir', note: `Deposit ${dep.id}`,
    });
  } catch (e) {
    // Gagal menambah saldo -> kembalikan ke pending supaya dicoba lagi (webhook berikutnya / cek status)
    await supabaseAdmin.from('deposits')
      .update({ status: 'pending', confirmed_by: null, confirmed_at: null }).eq('id', dep.id);
    console.error('settleDeposit: gagal kredit saldo:', e.message);
    return { status: 'pending', note: 'Gagal menambah saldo, akan dicoba lagi' };
  }

  try {
    const { data: c } = await supabaseAdmin.from('customers').select('phone').eq('id', dep.customer_id).single();
    if (c?.phone) {
      await sendViaFonnte(c.phone, `*Zyfay Official*\n\nDeposit ${rupiah(dep.nominal)} sudah masuk ke saldo kamu ✅\nSaldo sekarang: ${rupiah(balance)}`);
    }
  } catch (e) {
    console.error('settleDeposit: gagal kirim notif WA:', e.message);
  }

  return { status: 'success', balance };
}

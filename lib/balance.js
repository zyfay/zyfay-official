// lib/balance.js
// Ubah saldo customer dengan aman: pakai "compare-and-swap" (update hanya kalau saldo
// belum berubah sejak dibaca), diulang beberapa kali kalau tabrakan. Tiap perubahan dicatat.
import { supabaseAdmin } from './supabase';

export async function creditBalance(customerId, amount, { kind = 'admin', note = null, adminName = null } = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: cust } = await supabaseAdmin.from('customers').select('balance').eq('id', customerId).single();
    if (!cust) throw new Error('Customer tidak ditemukan');

    const current = cust.balance || 0;
    const next = current + amount;
    if (next < 0) throw new Error('Saldo tidak cukup');

    const { data: updated, error } = await supabaseAdmin
      .from('customers')
      .update({ balance: next, updated_at: new Date().toISOString() })
      .eq('id', customerId)
      .eq('balance', current)
      .select('balance');
    if (error) throw new Error(error.message);

    if (updated && updated.length > 0) {
      await supabaseAdmin.from('balance_logs').insert({
        customer_id: customerId, amount, balance_after: next, note, admin_name: adminName, kind,
      });
      return next;
    }
  }
  throw new Error('Saldo sedang berubah, coba lagi');
}

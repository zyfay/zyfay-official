// lib/orderHistory.js
// Nyimpen jejak transaksi user di localStorage browser, biar bisa diliat
// lagi tanpa harus ingat/ketik ID pesanan (mis. pas gak sengaja keluar dari
// halaman QRIS).

const KEY = 'zyfay_riwayat_v1';
const MAX_ITEMS = 30;

export function getHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(entry) {
  if (typeof window === 'undefined' || !entry?.id) return;
  try {
    const current = getHistory().filter(o => o.id !== entry.id);
    const updated = [{ ...entry, saved_at: new Date().toISOString() }, ...current].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Gagal simpan riwayat:', e);
  }
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

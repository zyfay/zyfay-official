// lib/akunConfig.js
// Konfigurasi akun customer. Isinya murni konstanta, aman dipakai di browser maupun server.

// ---- Referral ----------------------------------------------------------
// Bonus (Rp) yang didapat PENGAJAK dan TEMAN YANG DIAJAK saat pendaftaran berhasil.
export const REFERRAL_BONUS = 200;

// ---- Deposit -----------------------------------------------------------
export const MIN_DEPOSIT = 100000;
export const MAX_DEPOSIT = 5000000;
export const MAX_PENDING_DEPOSITS = 3;

// Metode bayar deposit via TokoVoucher.
// "code" = nilai parameter `kode` dari halaman "Kode Bank" TokoVoucher
// (https://docs.tokovoucher.net/kode-bank — daftarnya baru muncul kalau dibuka di browser).
// Ganti semua yang berawalan ISI_ dengan kode asli. Metode yang masih berawalan ISI_
// otomatis disembunyikan dari customer, jadi aman kalau belum semuanya diisi.
export const DEPOSIT_METHODS = [
  { id: 'qris',   name: 'QRIS',                desc: 'Semua e-wallet & m-banking',  code: 'ISI_KODE_QRIS' },
  { id: 'bank',   name: 'Transfer Bank',       desc: 'Transfer ke rekening tujuan', code: 'ISI_KODE_BANK' },
  { id: 'va',     name: 'Virtual Account',     desc: 'Bayar lewat nomor VA',        code: 'ISI_KODE_VA' },
];

// ---- Avatar ------------------------------------------------------------
// Format tersimpan: "ikon:warna", contoh "zap:purple".
export const AVATAR_ICON_KEYS = ['zap', 'gamepad', 'flame', 'star', 'crown', 'rocket', 'shield', 'gem', 'ghost', 'trophy', 'sparkles', 'heart'];
export const AVATAR_COLOR_KEYS = ['purple', 'violet', 'indigo', 'fuchsia', 'sky', 'emerald'];
export const DEFAULT_AVATAR = 'zap:purple';

export function isValidAvatar(value) {
  if (typeof value !== 'string') return false;
  const [icon, color] = value.split(':');
  return AVATAR_ICON_KEYS.includes(icon) && AVATAR_COLOR_KEYS.includes(color);
}

export function rupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID');
}

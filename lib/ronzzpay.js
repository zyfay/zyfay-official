// lib/ronzzpay.js
// RonzzPay Payment Gateway Integration
// Docs: https://pg.ronzzyt.id

const BASE_URL = 'https://pg.ronzzyt.id/api';
const API_KEY = process.env.RONZZPAY_API_KEY;

/**
 * Buat transaksi pembayaran
 * @param {Object} params
 * @param {string} params.code - qris, dana, ovo, gopay, shopeepay, linkaja
 * @param {number} params.amount - jumlah pembayaran
 * @param {string} params.description - deskripsi pesanan
 */
export async function createTransaction({ code, amount, description }) {
  const res = await fetch(`${BASE_URL}/transaction/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: API_KEY,
      code,
      amount,
      description,
    }),
  });
  return res.json();
}

/**
 * Cek status transaksi
 * @param {string} reff_id - reference ID dari response create transaction
 */
export async function checkTransaction(reff_id) {
  const res = await fetch(`${BASE_URL}/transaction/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: API_KEY,
      reff_id,
    }),
  });
  return res.json();
}

export const isConfigured = () => !!API_KEY;

export const PAYMENT_METHODS = [
  { code: 'qris',      label: 'QRIS',      icon: '▦', type: 'ewallet' },
  { code: 'dana',      label: 'DANA',      icon: '💙', type: 'ewallet' },
  { code: 'gopay',     label: 'GoPay',     icon: '💚', type: 'ewallet' },
  { code: 'ovo',       label: 'OVO',       icon: '💜', type: 'ewallet' },
  { code: 'shopeepay', label: 'ShopeePay', icon: '🧡', type: 'ewallet' },
  { code: 'linkaja',   label: 'LinkAja',   icon: '❤️', type: 'ewallet' },
];

// lib/pakasir.js
const PROJECT = process.env.PAKASIR_PROJECT;
const API_KEY = process.env.PAKASIR_API_KEY;
const BASE_URL = 'https://app.pakasir.com/api/v2';

export const pakasir = {
  isConfigured: () => !!(PROJECT && API_KEY),

  // method: lihat kode di lib/paymentMethods.js (qris, bni_va, bri_va, dst)
  createTransaction: async ({ method, orderId, amount }) => {
    const res = await fetch(`${BASE_URL}/create-transaction/${PROJECT}/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ method, amount }),
    });
    return res.json();
    // { txn_id, project, order_id, amount, fee, total_payment, payment_method,
    //   qr_string, va_number, expired_at, is_sandbox, status, completed_at }
  },

  getTransactionStatus: async (txnId) => {
    const res = await fetch(`${BASE_URL}/transaction-status/${PROJECT}/${txnId}`, {
      headers: { 'X-Api-Key': API_KEY },
    });
    return res.json();
    // { txn_id, order_id, amount, is_sandbox, status, completed_at }
  },

  cancelTransaction: async (txnId) => {
    const res = await fetch(`${BASE_URL}/cancel-transaction/${PROJECT}/${txnId}`, {
      method: 'POST',
      headers: { 'X-Api-Key': API_KEY },
    });
    return res.json();
  },
};

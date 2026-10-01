// lib/pakasir.js
const PROJECT = process.env.PAKASIR_PROJECT;
const API_KEY = process.env.PAKASIR_API_KEY;
const BASE_URL = 'https://app.pakasir.com/api';

export const pakasir = {
  isConfigured: () => !!(PROJECT && API_KEY),

  // method: lihat kode di lib/paymentMethods.js (qris, bni_va, bri_va, dst)
  createTransaction: async ({ method, orderId, amount }) => {
    const res = await fetch(`${BASE_URL}/transactioncreate/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: PROJECT, order_id: orderId, amount, api_key: API_KEY }),
    });
    return res.json(); // { payment: { payment_method, payment_number, amount, fee, total_payment, expired_at } }
  },

  getTransactionDetail: async ({ orderId, amount }) => {
    const url = new URL(`${BASE_URL}/transactiondetail`);
    url.searchParams.set('project', PROJECT);
    url.searchParams.set('amount', amount);
    url.searchParams.set('order_id', orderId);
    url.searchParams.set('api_key', API_KEY);
    const res = await fetch(url.toString());
    return res.json(); // { transaction: { status, ... } }
  },

  cancelTransaction: async ({ orderId, amount }) => {
    const res = await fetch(`${BASE_URL}/transactioncancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: PROJECT, order_id: orderId, amount, api_key: API_KEY }),
    });
    return res.json();
  },
};

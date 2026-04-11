// lib/midtrans.js
// Midtrans Payment Gateway Integration
// Docs: https://docs.midtrans.com

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY;
const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

const BASE_URL = IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';

export const MIDTRANS_CLIENT_KEY = CLIENT_KEY;
export const MIDTRANS_IS_PRODUCTION = IS_PRODUCTION;
export const isConfigured = () => !!(SERVER_KEY && CLIENT_KEY);

/**
 * Create Snap transaction token
 * @param {Object} order
 */
export async function createTransaction(order) {
  if (!SERVER_KEY) throw new Error('Midtrans server key not configured');

  const authString = Buffer.from(SERVER_KEY + ':').toString('base64');

  const payload = {
    transaction_details: {
      order_id: order.id,
      gross_amount: order.amount,
    },
    customer_details: {
      first_name: order.user_name || 'Customer',
      email: order.user_email || 'customer@zyfay.id',
    },
    item_details: [
      {
        id: order.product_id || 'PRODUCT',
        price: order.amount,
        quantity: 1,
        name: order.product_name || 'Top Up',
      },
    ],
    callbacks: {
      finish: `${process.env.NEXT_PUBLIC_SITE_URL}/topup/success?order_id=${order.id}`,
      error: `${process.env.NEXT_PUBLIC_SITE_URL}/topup/failed?order_id=${order.id}`,
      pending: `${process.env.NEXT_PUBLIC_SITE_URL}/cek-pesanan?id=${order.id}`,
    },
  };

  const res = await fetch(`${BASE_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_messages?.join(', ') || 'Midtrans error');
  return data; // { token, redirect_url }
}

/**
 * Verify Midtrans notification signature
 */
export function verifySignature(orderId, statusCode, grossAmount, serverKey) {
  const crypto = require('crypto');
  const hash = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex');
  return hash;
}

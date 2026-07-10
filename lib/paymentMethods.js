// lib/paymentMethods.js
// Daftar metode pembayaran yang didukung Pakasir. File ini aman diimport
// dari client maupun server karena tidak menyimpan kredensial apapun.

export const PAYMENT_METHODS = [
  { code: 'qris', label: 'QRIS', type: 'qris', desc: 'GoPay, OVO, DANA, ShopeePay, LinkAja, Mobile Banking' },
  { code: 'bni_va', label: 'BNI Virtual Account', bank: 'BNI', type: 'va' },
  { code: 'bri_va', label: 'BRI Virtual Account', bank: 'BRI', type: 'va' },
  { code: 'cimb_niaga_va', label: 'CIMB Niaga Virtual Account', bank: 'CIMB Niaga', type: 'va' },
  { code: 'permata_va', label: 'Permata Virtual Account', bank: 'Permata', type: 'va' },
  { code: 'maybank_va', label: 'Maybank Virtual Account', bank: 'Maybank', type: 'va' },
  { code: 'atm_bersama_va', label: 'ATM Bersama Virtual Account', bank: 'ATM Bersama', type: 'va' },
  { code: 'sampoerna_va', label: 'Bank Sahabat Sampoerna VA', bank: 'Sampoerna', type: 'va' },
  { code: 'bnc_va', label: 'Bank Neo Commerce VA', bank: 'BNC', type: 'va' },
  { code: 'artha_graha_va', label: 'Artha Graha Virtual Account', bank: 'Artha Graha', type: 'va' },
];

export function getPaymentMethod(code) {
  return PAYMENT_METHODS.find(m => m.code === code) || PAYMENT_METHODS[0];
}

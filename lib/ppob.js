// lib/ppob.js
// Helper PPOB: pemetaan produk TokoVoucher -> game_id ppob-*, hitung harga jual, baca hasil inquiry.

export const PPOB_GROUPS = {
  'ppob-pulsa':            { name: 'Pulsa',            category: 'topup' },
  'ppob-paket-data':       { name: 'Paket Data',       category: 'topup' },
  'ppob-token-pln':        { name: 'Token PLN',        category: 'topup' },
  'ppob-dana':             { name: 'DANA',             category: 'topup' },
  'ppob-ovo':              { name: 'OVO',              category: 'topup' },
  'ppob-gopay':            { name: 'GoPay',            category: 'topup' },
  'ppob-shopeepay':        { name: 'ShopeePay',        category: 'topup' },
  'ppob-ewallet-lainnya':  { name: 'E-Wallet Lainnya', category: 'topup' },
  'ppob-voucher-hiburan':  { name: 'Voucher Hiburan',  category: 'voucher' },
  // Pascabayar: nominal TIDAK tetap, harus lewat inquiry. Produknya dibuat nonaktif supaya
  // tidak bisa dibeli lewat alur order biasa (yang memakai harga tetap dari tabel products).
  'ppob-tagihan-pln':      { name: 'Tagihan PLN',      category: 'topup', postpaid: true },
  'ppob-tagihan-pdam':     { name: 'Tagihan Air PDAM', category: 'topup', postpaid: true },
  'ppob-tagihan-bpjs':     { name: 'Tagihan BPJS',     category: 'topup', postpaid: true },
  'ppob-tagihan-internet': { name: 'Tagihan Internet', category: 'topup', postpaid: true },
  'ppob-tagihan-lainnya':  { name: 'Tagihan Lainnya',  category: 'topup', postpaid: true },
};

const low = x => String(x ?? '').toLowerCase();

// Tentukan produk TokoVoucher masuk grup PPOB yang mana. null = bukan PPOB (dilewati).
// Aturan dicocokkan ke NAMA kategori/operator/jenis/produk, jadi kalau nama di akun TokoVoucher
// lo beda, lihat hasil "Preview" lalu minta aturan ini disesuaikan.
export function classifyProduct({ category, operator, jenis, produk }) {
  const cat = low(category?.nama);
  const op = low(operator?.nama);
  const jn = low(jenis?.nama);
  const nm = low(produk?.nama);
  const names = `${op} ${jn} ${nm}`;

  // 1) Pascabayar / tagihan (TokoVoucher: category_id 13)
  if (Number(produk?.kategori_id ?? category?.id) === 13 || /pascabayar|tagihan/.test(cat)) {
    if (/pln|listrik/.test(names)) return 'ppob-tagihan-pln';
    if (/pdam|\bair\b/.test(names)) return 'ppob-tagihan-pdam';
    if (/bpjs/.test(names)) return 'ppob-tagihan-bpjs';
    if (/internet|indihome|telkom|first ?media|wifi|\btv\b/.test(names)) return 'ppob-tagihan-internet';
    return 'ppob-tagihan-lainnya';
  }

  // 2) Kategori game sudah ditangani katalog game yang ada
  if (/game/.test(cat)) return null;

  // 3) E-wallet
  if (/\bdana\b/.test(op)) return 'ppob-dana';
  if (/\bovo\b/.test(op)) return 'ppob-ovo';
  if (/go ?-?pay|gojek/.test(op)) return 'ppob-gopay';
  if (/shopee ?-?pay/.test(op)) return 'ppob-shopeepay';
  if (/e-?money|e-?wallet|dompet/.test(cat) || /link ?aja|i\.?saku|doku|sakuku|gopay/.test(op)) return 'ppob-ewallet-lainnya';

  // 4) Token PLN prabayar
  if (/pln/.test(`${cat} ${names}`) && /token|prabayar|listrik/.test(`${cat} ${names}`)) return 'ppob-token-pln';

  // 5) Voucher hiburan / streaming
  if (/hiburan|streaming|entertain/.test(cat) || /netflix|spotify|vidio|disney|\bviu\b|wetv|iqiyi|youtube|\bhbo\b|prime video|bstation|canva|capcut/.test(op)) {
    return 'ppob-voucher-hiburan';
  }

  // 6) Paket data lalu pulsa
  const telcoCat = /pulsa|data|paket|kuota|seluler|operator/.test(cat);
  const dataByCat = /data|internet|kuota/.test(cat) && !/pulsa/.test(cat);   // kategori "Pulsa & Data" TIDAK otomatis data
  const dataByName = /paket data|kuota|internet|\b\d+(\.\d+)?\s?(gb|mb)\b/.test(`${jn} ${nm}`);
  if (telcoCat && (dataByCat || dataByName)) return 'ppob-paket-data';
  if (/pulsa/.test(cat)) return 'ppob-pulsa';

  return null;
}

// Harga jual = harga modal + margin %, + margin tetap, dibulatkan KE ATAS ke kelipatan roundTo. Tidak pernah di bawah modal.
export function sellPrice(cost, { marginPercent = 3, marginFlat = 0, roundTo = 100 } = {}) {
  const c = Math.max(0, Math.round(Number(cost) || 0));
  if (c === 0) return 0;
  const raw = c * (1 + (Number(marginPercent) || 0) / 100) + (Number(marginFlat) || 0);
  const step = Math.max(1, Math.round(Number(roundTo) || 1));
  return Math.max(c, Math.ceil(raw / step) * step);
}

const int = v => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : 0; };

// Rapikan balasan inquiry pascabayar TokoVoucher.
export function parsePascaInquiry(r) {
  const ok = low(r?.status) === 'sukses';
  const price = int(r?.price);
  const sellingPrice = int(r?.selling_price);
  return {
    ok,
    message: r?.message || r?.error_msg || '',
    customer_no: String(r?.customer_no ?? ''),
    customer_name: String(r?.customer_name ?? '').trim(),
    period: String(r?.blnth ?? ''),
    due_date: r?.due_date || null,
    tagihan: int(r?.tagihan),
    admin: int(r?.admin),
    denda: int(r?.denda),
    months: int(r?.jml_bulan) || 1,
    info: r?.data ? String(r.data) : '',
    price,
    selling_price: sellingPrice,
  };
}

// Nominal yang DITAGIH ke pembeli, dihitung di server: harga jual dari TokoVoucher
// (tidak pernah di bawah harga modal) + biaya tambahan opsional dari env PPOB_POSTPAID_FEE.
export function totalCharge(inq, extraFee = 0) {
  const base = Math.max(inq.price, inq.selling_price);
  return base > 0 ? base + Math.max(0, int(extraFee)) : 0;
}

// "BUDI SANTOSO" -> "BU** SA*****"
export function maskPersonName(name) {
  return String(name || '').trim().split(/\s+/).filter(Boolean)
    .map(w => (w.length <= 2 ? w[0] + '*' : w.slice(0, 2) + '*'.repeat(Math.min(w.length - 2, 6))))
    .join(' ');
}

// lib/pricing.js
// Harga yang berlaku dihitung di SERVER dari database, bukan dari angka kiriman browser.
// Flash sale hanya dihitung kalau aktif DAN sedang dalam rentang waktunya.
import { supabaseAdmin } from './supabase';

export async function getServerPrice(productId) {
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, name, price, is_active, tv_code, metadata')
    .eq('id', productId)
    .maybeSingle();

  if (!product || product.is_active === false) return null;

  // Produk pascabayar (PPOB) nominalnya tidak tetap: harganya HARUS dari inquiry
  // (/api/app/ppob/inquiry + /bayar). Tolak di alur order biasa supaya tidak bisa dibayar Rp0.
  const meta = product.metadata;
  if (meta && typeof meta === 'object' && meta.is_postpaid === true) return null;

  const now = new Date().toISOString();
  const { data: sales } = await supabaseAdmin
    .from('flash_sales')
    .select('sale_price')
    .eq('product_id', productId)
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('sale_price', { ascending: true })
    .limit(1);

  const flash = sales?.[0];
  // Flash sale yang harganya malah lebih mahal dari harga normal diabaikan
  const price = flash && flash.sale_price > 0 ? Math.min(flash.sale_price, product.price) : product.price;

  return { product, price, isFlash: !!flash };
}

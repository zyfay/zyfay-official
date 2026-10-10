// pages/api/orders/create.js
import { supabaseAdmin } from '../../../lib/supabase';
import { pakasir } from '../../../lib/pakasir';
import { getCustomer, getUnlockedCustomer } from '../../../lib/customerAuth';
import { getServerPrice } from '../../../lib/pricing';
import { creditBalance } from '../../../lib/balance';
import { fulfillPaidOrder } from '../../../lib/fulfillOrder';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    game_id, game_name, product_id,
    product_price, form_data,
    user_email, user_name, customer_phone,
    payment_method,
    voucher_code,
    game_nickname,
  } = req.body;

  if (!product_id || !user_email) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }

  const method = payment_method || 'qris';
  const isSaldo = method === 'saldo';
  const gameUserId = form_data?.user_id?.toString().trim() || '';

  try {
    // Bayar pakai saldo: wajib sudah login DAN sudah memasukkan PIN di sesi ini
    let payer = null;
    if (isSaldo) {
      payer = await getUnlockedCustomer(req);
      if (!payer) {
        return res.status(401).json({ success: false, message: 'Untuk bayar pakai saldo, masuk ke akun dan masukkan PIN dulu' });
      }
    }

    // Anti-spam: kalau email yang sama masih punya pesanan pending untuk
    // produk & metode pembayaran yang sama, jangan bikin pesanan baru —
    // arahkan ke yang lama.
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('user_email', user_email)
      .eq('product_id', product_id)
      .eq('payment_method', method)
      .eq('order_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const dup = existing[0];
      let payment_data = null;
      if (dup.notes) {
        try { payment_data = JSON.parse(dup.notes); } catch {}
      }
      return res.json({
        success: true,
        order: dup,
        payment_data,
        duplicate: true,
      });
    }

    // ===== HARGA SELALU DIHITUNG DI SERVER dari database (produk + flash sale yang sedang berlangsung).
    // Angka "product_price" kiriman browser TIDAK dipakai sebagai harga. =====
    const priced = await getServerPrice(product_id);
    if (!priced) {
      return res.status(400).json({ success: false, message: 'Produk tidak ditemukan atau sedang tidak tersedia' });
    }

    // Kalau harga sebenarnya LEBIH MAHAL dari yang dilihat pembeli (misal flash sale baru saja berakhir),
    // jangan diam-diam menagih lebih: minta muat ulang halaman.
    const shownPrice = parseInt(product_price);
    if (Number.isFinite(shownPrice) && shownPrice < priced.price) {
      return res.status(409).json({
        success: false,
        message: 'Harga produk sudah berubah. Muat ulang halaman lalu coba lagi.',
        current_price: priced.price,
      });
    }

    const product_name = priced.product.name;
    let finalPrice = priced.price;
    let discountAmount = 0;
    let appliedVoucher = null;

    if (voucher_code?.trim()) {
      const normalizedCode = voucher_code.trim().toUpperCase();
      const { data: voucher } = await supabaseAdmin
        .from('vouchers')
        .select('*')
        .ilike('code', normalizedCode)
        .single();

      if (voucher && voucher.is_active && new Date(voucher.expires_at) > new Date() && gameUserId) {
        const { data: usage } = await supabaseAdmin
          .from('voucher_usages')
          .select('id')
          .eq('voucher_id', voucher.id)
          .eq('game_user_id', gameUserId)
          .maybeSingle();

        if (!usage) {
          discountAmount = Math.round((finalPrice * voucher.discount_percent) / 100);
          finalPrice = Math.max(0, finalPrice - discountAmount);
          appliedVoucher = voucher;
        }
      }
    }

    // Saldo gak bisa dipakai buat bayar Rp0, dan cek cepat sebelum order dibuat
    if (isSaldo) {
      const { data: me } = await supabaseAdmin.from('customers').select('balance').eq('id', payer.id).single();
      if ((me?.balance || 0) < finalPrice) {
        return res.status(400).json({ success: false, message: 'Saldo kamu tidak cukup. Isi saldo dulu lewat menu Deposit.' });
      }
    }

    const orderId = `ZY-${Date.now()}`;

    // Kalau customer lagi login, pesanan ini ikut tercatat di riwayat akunnya.
    // Tamu (belum login) tetap order seperti biasa, customer_id kosong.
    const sessionCustomer = payer || await getCustomer(req).catch(() => null);

    const orderRow = {
      id: orderId,
      game_id, game_name, product_id, product_name,
      product_price: finalPrice,
      user_email, user_name,
      customer_phone: customer_phone || null,
      form_data: form_data || {},
      payment_method: method,
      payment_status: 'pending',
      order_status: 'pending',
      voucher_code: appliedVoucher ? appliedVoucher.code : null,
      discount_amount: discountAmount,
      game_nickname: game_nickname || null,
    };

    let { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert(sessionCustomer ? { ...orderRow, customer_id: sessionCustomer.id } : orderRow)
      .select()
      .single();

    // Kolom customer_id belum ada (SQL belum dijalankan)? Jangan sampai order gagal gara-gara itu: ulangi tanpa customer_id.
    if (error && sessionCustomer && !isSaldo && ['42703', 'PGRST204'].includes(error.code)) {
      ({ data: order, error } = await supabaseAdmin.from('orders').insert(orderRow).select().single());
    }

    if (error) throw error;

    // Kunci pemakaian voucher-nya buat ID game ini
    if (appliedVoucher && gameUserId) {
      await supabaseAdmin.from('voucher_usages').insert({
        voucher_id: appliedVoucher.id,
        game_user_id: gameUserId,
        order_id: orderId,
      });
    }

    // ===================== JALUR SALDO =====================
    if (isSaldo) {
      try {
        // Potong saldo secara atomik (compare-and-swap) — gagal kalau saldo kurang / baru berubah
        await creditBalance(payer.id, -finalPrice, {
          kind: 'purchase', adminName: 'sistem', note: `Pesanan ${orderId}`,
        });
      } catch (e) {
        await supabaseAdmin
          .from('orders')
          .update({ order_status: 'failed', payment_status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', orderId);
        if (appliedVoucher && gameUserId) {
          await supabaseAdmin.from('voucher_usages').delete().eq('order_id', orderId);
        }
        const msg = e.message === 'Saldo tidak cukup'
          ? 'Saldo kamu tidak cukup. Isi saldo dulu lewat menu Deposit.'
          : 'Gagal memotong saldo, coba lagi: ' + e.message;
        return res.status(400).json({ success: false, message: msg });
      }

      await supabaseAdmin
        .from('orders')
        .update({ payment_status: 'paid', order_status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      let resultStatus = 'processing';
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
        const r = await fulfillPaidOrder({ ...order, payment_status: 'paid' }, baseUrl);
        resultStatus = r.status;
      } catch (e) {
        // Saldo sudah terpotong & pesanan tercatat "processing". Jangan di-refund otomatis di sini:
        // status di TokoVoucher belum pasti. Webhook/cek status akan menentukan (dan mengembalikan saldo kalau gagal).
        console.error('Fulfill saldo order error:', orderId, e.message);
      }

      return res.json({
        success: true,
        paid: true,
        order: { ...order, payment_status: 'paid', order_status: resultStatus },
        payment_data: null,
        discount_amount: discountAmount,
      });
    }

    // ===================== JALUR QRIS / VA (Pakasir) =====================
    let paymentData = null;

    // Buat transaksi pembayaran via Pakasir API v2 (pakai harga FINAL setelah diskon)
    if (pakasir.isConfigured()) {
      try {
        const pkRes = await pakasir.createTransaction({ method, orderId, amount: finalPrice });

        if (pkRes?.txn_id) {
          paymentData = pkRes;
          await supabaseAdmin
            .from('orders')
            .update({ notes: JSON.stringify(pkRes), txn_id: pkRes.txn_id })
            .eq('id', orderId);
        } else {
          console.error('Pakasir create error:', pkRes);
        }
      } catch (pkErr) {
        console.error('Pakasir error:', pkErr.message);
      }
    }

    return res.json({
      success: true,
      order,
      payment_data: paymentData,
      discount_amount: discountAmount,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Gagal membuat pesanan: ' + err.message });
  }
}

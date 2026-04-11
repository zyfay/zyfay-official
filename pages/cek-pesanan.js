// pages/cek-pesanan.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Search, Package, ArrowLeft, Loader2, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import { supabaseAdmin } from '../lib/supabase';

export default function CekPesanan() {
  const router = useRouter();
  const [id, setId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (router.query.id) {
      setId(router.query.id);
      checkOrder(router.query.id);
    }
  }, [router.query.id]);

  async function checkOrder(orderId) {
    const searchId = orderId || id;
    if (!searchId.trim()) { setError('Masukkan ID pesanan'); return; }
    setLoading(true); setError(''); setOrder(null);

    try {
      const res = await fetch(`/api/orders/check?id=${searchId}`);
      const data = await res.json();
      if (data.success) setOrder(data.order);
      else setError(data.message || 'Pesanan tidak ditemukan');
    } catch {
      setError('Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  }

  const statusMap = {
    pending:    { label: 'Menunggu Pembayaran', icon: <Clock size={18} />, cls: 'badge-warning' },
    processing: { label: 'Sedang Diproses',     icon: <RefreshCw size={18} className="animate-spin" />, cls: 'badge-info' },
    success:    { label: 'Berhasil',             icon: <CheckCircle size={18} />, cls: 'badge-success' },
    failed:     { label: 'Gagal',                icon: <XCircle size={18} />, cls: 'badge-danger' },
    expired:    { label: 'Kadaluarsa',           icon: <XCircle size={18} />, cls: 'badge-danger' },
  };

  return (
    <>
      <Head><title>Cek Pesanan | {process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay'}</title></Head>
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-10">
          <Link href="/" className="btn-ghost text-sm mb-6 inline-flex"><ArrowLeft size={16} /> Kembali</Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-primary-glow" />
            </div>
            <h1 className="font-display text-2xl font-bold">Cek Pesanan</h1>
          </div>
          <p className="text-muted text-sm mb-8">Masukkan ID pesanan untuk melihat status transaksi</p>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="ZY-1234567890"
              value={id}
              onChange={e => setId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkOrder()}
              className="input-field"
            />
            <button onClick={() => checkOrder()} disabled={loading} className="btn-primary px-5 flex-shrink-0">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>

          {error && (
            <div className="card p-4 border-red-500/30 bg-red-500/5 text-red-400 text-sm flex items-center gap-2 mb-4">
              <XCircle size={16} /> {error}
            </div>
          )}

          {order && (() => {
            const s = statusMap[order.order_status] || statusMap.pending;
            return (
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {s.icon}
                    <span className={s.cls + ' badge'}>{s.label}</span>
                  </div>
                  <span className="text-muted text-xs font-mono">{order.id}</span>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { l: 'Game', v: order.game_name },
                    { l: 'Produk', v: order.product_name },
                    { l: 'Total', v: `Rp ${order.product_price?.toLocaleString('id-ID')}` },
                    { l: 'Email', v: order.user_email },
                    { l: 'Tanggal', v: new Date(order.created_at).toLocaleString('id-ID') },
                    order.tv_sn && { l: 'Serial Number', v: order.tv_sn },
                  ].filter(Boolean).map(row => (
                    <div key={row.l} className="flex justify-between text-sm">
                      <span className="text-muted">{row.l}</span>
                      <span className="font-medium">{row.v}</span>
                    </div>
                  ))}
                </div>
                {order.order_status === 'pending' && order.midtrans_url && (
                  <div className="p-4 border-t border-border">
                    <a href={order.midtrans_url} className="btn-primary w-full text-sm">
                      <CreditCard size={15} /> Selesaikan Pembayaran
                    </a>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}

// pages/riwayat.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { History, ArrowLeft, Loader2, CheckCircle, Clock, XCircle, RefreshCw, CreditCard, Trash2, Package, Ban } from 'lucide-react';
import Navbar from '../components/Navbar';
import ConfirmModal from '../components/ConfirmModal';
import { getHistory, clearHistory } from '../lib/orderHistory';

const statusMap = {
  pending:    { label: 'Menunggu Pembayaran', icon: <Clock size={14} />, cls: 'badge-warning' },
  processing: { label: 'Sedang Diproses',     icon: <RefreshCw size={14} className="animate-spin" />, cls: 'badge-info' },
  success:    { label: 'Berhasil',             icon: <CheckCircle size={14} />, cls: 'badge-success' },
  failed:     { label: 'Gagal',                icon: <XCircle size={14} />, cls: 'badge-danger' },
  expired:    { label: 'Kadaluarsa',           icon: <XCircle size={14} />, cls: 'badge-danger' },
  unknown:    { label: 'Tidak diketahui',      icon: <XCircle size={14} />, cls: 'badge-purple' },
};

export default function Riwayat() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearModal, setClearModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null); // order id lagi mau dibatalkan
  const [cancelling, setCancelling] = useState(false);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const saved = getHistory();
    if (saved.length === 0) { setOrders([]); setLoading(false); return; }

    const results = await Promise.all(
      saved.map(async (item) => {
        try {
          const res = await fetch(`/api/orders/check?id=${item.id}`);
          const data = await res.json();
          if (data.success) return data.order;
        } catch {}
        // Fallback ke data lokal kalau gagal fetch (mis. lagi offline)
        return { ...item, order_status: 'unknown' };
      })
    );

    setOrders(results.filter(Boolean));
    setLoading(false);
  }

  function handleClear() {
    clearHistory();
    setOrders([]);
    setClearModal(false);
  }

  async function handleCancelOrder() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cancelTarget }),
      });
      const data = await res.json();
      if (data.success) {
        setOrders(prev => prev.map(o => o.id === cancelTarget ? { ...o, order_status: 'failed', cancel_reason: 'Dibatalkan oleh pengguna' } : o));
        setCancelTarget(null);
      }
    } catch {}
    finally { setCancelling(false); }
  }

  return (
    <>
      <Head><title>Riwayat Transaksi | {siteName}</title></Head>
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-10">
          <Link href="/" className="btn-ghost text-sm mb-6 inline-flex"><ArrowLeft size={16} /> Kembali</Link>

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
                <History size={20} className="text-primary-glow" />
              </div>
              <h1 className="font-display text-2xl font-bold">Riwayat Transaksi</h1>
            </div>
            {orders.length > 0 && (
              <button onClick={() => setClearModal(true)} className="text-muted hover:text-red-400 transition-colors p-2" title="Hapus riwayat">
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <p className="text-muted text-sm mb-8">Transaksi yang pernah kamu buat di perangkat ini</p>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="card p-8 text-center text-muted">
              <Package size={36} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada transaksi di perangkat ini</p>
              <Link href="/" className="btn-primary inline-flex mt-4 text-sm">Mulai Top Up</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const s = statusMap[order.order_status] || statusMap.pending;
                return (
                  <div key={order.id} className="card overflow-hidden">
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{order.product_name || '—'}</div>
                        <div className="text-muted text-xs mt-0.5">
                          {order.game_name}
                          {order.game_nickname && <span className="text-primary-glow"> · {order.game_nickname}</span>}
                        </div>
                        <div className="text-muted text-xs font-mono mt-1">{order.id}</div>
                        {order.created_at && (
                          <div className="text-muted text-xs mt-1">
                            {new Date(order.created_at).toLocaleString('id-ID')}
                          </div>
                        )}
                      </div>
                      <span className={s.cls + ' badge flex items-center gap-1 flex-shrink-0 whitespace-nowrap'}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                    <div className="px-4 pb-4 flex gap-2">
                      {order.order_status === 'pending' && (
                        <>
                          <Link href={`/bayar/${order.id}`} className="btn-primary flex-1 text-xs py-2">
                            <CreditCard size={14} /> Lanjutkan Pembayaran
                          </Link>
                          <button
                            onClick={() => setCancelTarget(order.id)}
                            className="w-9 h-9 flex-shrink-0 rounded-xl border border-border text-muted hover:text-red-400 hover:border-red-500/40 transition-colors flex items-center justify-center"
                            title="Batalkan pesanan"
                          >
                            <Ban size={14} />
                          </button>
                        </>
                      )}
                      <Link href={`/cek-pesanan?id=${order.id}`} className="btn-secondary flex-1 text-xs py-2 text-center">
                        Detail
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={clearModal}
        title="Hapus semua riwayat?"
        message="Ini cuma menghapus catatan di perangkat ini. Transaksi kamu tetap aman tersimpan di sistem kami."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        danger
        onConfirm={handleClear}
        onClose={() => setClearModal(false)}
      />

      <ConfirmModal
        open={!!cancelTarget}
        title="Batalkan pesanan ini?"
        message="Pesanan akan ditandai gagal dan QR pembayarannya gak bisa dipakai lagi. Kamu bisa bikin pesanan baru kapan aja."
        confirmLabel="Ya, Batalkan"
        cancelLabel="Jangan Dulu"
        danger
        loading={cancelling}
        onConfirm={handleCancelOrder}
        onClose={() => setCancelTarget(null)}
      />
    </>
  );
}

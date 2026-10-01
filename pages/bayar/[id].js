// pages/bayar/[id].js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Loader2, Copy, Check, Clock, XCircle, Ban, Download } from 'lucide-react';
import Navbar from '../../components/Navbar';
import LiveChat from '../../components/LiveChat';
import ConfirmModal from '../../components/ConfirmModal';
import { getPaymentMethod } from '../../lib/paymentMethods';
import toast from 'react-hot-toast';

export default function BayarPage() {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState(null);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const pollRef = useRef();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  useEffect(() => {
    if (!id) return;
    load();
    pollRef.current = setInterval(load, 5000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  async function load() {
    try {
      const res = await fetch(`/api/orders/check?id=${id}`);
      const data = await res.json();
      if (!data.success) { setNotFound(true); setLoading(false); return; }

      const o = data.order;
      setOrder(o);

      if (o.payment_status === 'paid' || o.order_status === 'success') {
        clearInterval(pollRef.current);
        router.replace(`/cek-pesanan?id=${o.id}`);
        return;
      }
      if (['failed', 'expired'].includes(o.order_status)) {
        clearInterval(pollRef.current);
        setLoading(false);
        return;
      }

      // API v2: QRIS pakai qr_string, VA pakai va_number
      if (o.payment_data?.qr_string || o.payment_data?.va_number) {
        setPaymentData(o.payment_data);
      }
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        clearInterval(pollRef.current);
        toast.success('Pesanan dibatalkan');
        setOrder(o => ({ ...o, order_status: 'failed', cancel_reason: 'Dibatalkan oleh pengguna' }));
        setShowCancelModal(false);
      } else {
        toast.error(data.message || 'Gagal membatalkan pesanan');
      }
    } catch (e) {
      toast.error('Terjadi kesalahan');
    } finally {
      setCancelling(false);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Disalin!');
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadQR() {
    if (!paymentData?.qr_string) return;
    setDownloading(true);
    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(paymentData.qr_string)}`;
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `QRIS-${order.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success('QR berhasil diunduh');
    } catch (e) {
      toast.error('Gagal mengunduh QR');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-primary animate-spin" />
    </div>
  );

  if (notFound || !order) return (
    <div className="min-h-screen bg-bg flex items-center justify-center text-center px-4">
      <div>
        <p className="text-muted mb-4">Pesanan tidak ditemukan</p>
        <Link href="/riwayat" className="btn-primary inline-flex">Lihat Riwayat Transaksi</Link>
      </div>
    </div>
  );

  const isQris = paymentData?.payment_method === 'qris';
  const isExpired = paymentData?.expired_at && new Date(paymentData.expired_at).getTime() < Date.now();

  return (
    <>
      <Head><title>Bayar Pesanan | {siteName}</title></Head>
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-8">
          <Link href="/riwayat" className="btn-ghost text-sm mb-6 inline-flex">
            <ArrowLeft size={16} /> Riwayat Transaksi
          </Link>

          <div className="text-center mb-6">
            <h2 className="font-display text-2xl font-bold">{isQris ? 'Scan & Bayar' : 'Transfer & Bayar'}</h2>
            <p className="text-muted text-sm mt-1">
              ID: <span className="text-primary-glow font-mono">{order.id}</span>
            </p>
            <p className="text-muted text-xs mt-1">{order.product_name} · {order.game_name}</p>
          </div>

          {['failed', 'expired'].includes(order.order_status) ? (
            <div className="card p-6 text-center">
              <XCircle size={32} className="text-red-400 mx-auto mb-3" />
              <p className="font-semibold mb-1">
                {order.cancel_reason
                  ? 'Pesanan ini sudah dibatalkan'
                  : `Pesanan ini sudah ${order.order_status === 'failed' ? 'gagal' : 'kedaluwarsa'}`}
              </p>
              <p className="text-muted text-sm">Silakan buat pesanan baru ya.</p>
              <Link href="/" className="btn-primary inline-flex mt-4 text-sm">Top Up Lagi</Link>
            </div>
          ) : isExpired ? (
            <div className="card p-6 mb-5 text-center">
              <Clock size={32} className="text-amber-400 mx-auto mb-3" />
              <p className="font-semibold mb-1">Waktu pembayaran sudah habis</p>
              <p className="text-muted text-sm mb-5">
                Kode pembayaran ini sudah kedaluwarsa dan tidak bisa dipakai lagi. Batalkan pesanan ini, lalu buat pesanan baru untuk melanjutkan.
              </p>
              <button onClick={() => setShowCancelModal(true)} className="btn-primary w-full text-sm">
                <Ban size={15} /> Batalkan Pesanan Ini
              </button>
            </div>
          ) : paymentData ? (
            <div className="card p-6 mb-5 text-center space-y-4">
              {isQris ? (
                <>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentData.qr_string)}`}
                    alt="QRIS"
                    className="w-56 h-56 mx-auto rounded-2xl border-2 border-border bg-white p-2"
                  />
                  <p className="text-muted text-xs">
                    Scan dengan GoPay, OVO, DANA, ShopeePay, LinkAja, atau mobile banking
                  </p>
                  <button onClick={downloadQR} disabled={downloading} className="btn-secondary w-full text-sm">
                    {downloading
                      ? <><Loader2 size={14} className="animate-spin" /> Mengunduh...</>
                      : <><Download size={14} /> Unduh Gambar QR</>}
                  </button>
                </>
              ) : (
                <div className="bg-card-hover rounded-xl p-4">
                  <div className="text-muted text-xs mb-1">
                    Transfer ke Virtual Account {getPaymentMethod(paymentData.payment_method).bank}
                  </div>
                  <div className="font-display text-2xl font-bold tracking-wider text-white break-all">
                    {paymentData.va_number}
                  </div>
                </div>
              )}

              <div className="bg-card-hover rounded-xl p-4">
                <div className="text-muted text-xs mb-1">Total yang harus dibayar</div>
                <div className="font-display text-2xl font-bold text-primary-glow">
                  Rp {(paymentData.total_payment || paymentData.amount || order.product_price)?.toLocaleString('id-ID')}
                </div>
                {paymentData.fee > 0 && (
                  <div className="text-muted text-xs mt-1">
                    (termasuk biaya admin Rp {paymentData.fee?.toLocaleString('id-ID')})
                  </div>
                )}
              </div>

              {paymentData.expired_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Berlaku hingga</span>
                  <span className="text-amber-400 font-medium">
                    {new Date(paymentData.expired_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              )}

              <div>
                <div className="text-muted text-xs mb-1">
                  {isQris ? 'Salin kode QR' : 'Salin nomor Virtual Account'}
                </div>
                <div className="flex items-center gap-2 bg-card rounded-xl p-3 border border-border">
                  <span className="font-mono text-xs text-muted flex-1 truncate">
                    {isQris ? `${paymentData.qr_string.slice(0, 30)}...` : paymentData.va_number}
                  </span>
                  <button
                    onClick={() => copyToClipboard(isQris ? paymentData.qr_string : paymentData.va_number)}
                    className="text-muted hover:text-white flex-shrink-0"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-primary-glow flex items-center gap-2">
                <Loader2 size={12} className="animate-spin flex-shrink-0" />
                Menunggu konfirmasi pembayaran secara otomatis...
              </div>
            </div>
          ) : (
            <div className="card p-6 mb-5 text-center">
              <Clock size={28} className="text-amber-400 mx-auto mb-3" />
              <p className="text-muted text-sm">Pembayaran sedang disiapkan, mohon tunggu sebentar...</p>
            </div>
          )}

          <Link href={`/cek-pesanan?id=${order.id}`} className="btn-secondary w-full">
            Cek Status Pesanan
          </Link>

          {!['failed', 'expired'].includes(order.order_status) && !isExpired && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full text-center text-red-400/80 hover:text-red-400 text-sm mt-4 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Ban size={14} /> Batalkan Pesanan
            </button>
          )}
        </div>
        <LiveChat />
      </div>

      <ConfirmModal
        open={showCancelModal}
        title="Batalkan pesanan ini?"
        message="Pesanan akan ditandai gagal dan kode pembayaran ini gak bisa dipakai lagi. Kamu bisa bikin pesanan baru kapan aja."
        confirmLabel="Ya, Batalkan"
        cancelLabel="Jangan Dulu"
        danger
        loading={cancelling}
        onConfirm={handleCancel}
        onClose={() => setShowCancelModal(false)}
      />
    </>
  );
}

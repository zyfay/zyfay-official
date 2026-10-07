// pages/akun/saldo.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Loader2, LogOut, Copy, Wallet, ArrowLeft, Phone, Mail, Gift } from 'lucide-react';

const STATUS_LABEL = {
  pending: { text: 'Menunggu', color: 'text-amber-400' },
  processing: { text: 'Diproses', color: 'text-sky-400' },
  success: { text: 'Berhasil', color: 'text-emerald-400' },
  failed: { text: 'Gagal', color: 'text-red-400' },
};

export default function SaldoPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const me = await fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json());
      if (!me.success) { router.replace('/akun/masuk'); return; }
      if (!me.isUnlocked) { router.replace('/akun/pin'); return; }
      setData(me);

      const ordersRes = await fetch('/api/auth/orders', { credentials: 'include' }).then(r => r.json());
      if (ordersRes.success) setOrders(ordersRes.orders);
    } catch (e) {
      toast.error('Gagal memuat data akun');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/');
  }

  function copyReferral() {
    navigator.clipboard.writeText(data.referral_code);
    toast.success('Kode referral disalin');
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Head><title>Akun Saya | Zyfay Official</title></Head>
      <div className="min-h-screen px-5 py-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/')} className="btn-ghost">
            <ArrowLeft size={18} /> Beranda
          </button>
          <button onClick={handleLogout} className="btn-ghost text-red-400">
            <LogOut size={16} /> Keluar
          </button>
        </div>

        <h1 className="font-display text-xl font-bold mb-1">Halo, {data.name} 👋</h1>
        <p className="text-muted text-sm mb-6">Selamat datang kembali di akun Zyfay Official kamu</p>

        {/* Kartu saldo */}
        <div className="rounded-3xl bg-gradient-to-br from-primary to-purple-700 p-6 mb-6 text-white shadow-glow-sm">
          <div className="flex items-center gap-2 mb-2 opacity-80 text-sm">
            <Wallet size={16} /> Saldo Kamu
          </div>
          <div className="font-display text-3xl font-bold">
            Rp{(data.balance || 0).toLocaleString('id-ID')}
          </div>
        </div>

        {/* Info akun */}
        <div className="card p-5 mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-muted flex-shrink-0" />
            <span className="text-sm">{data.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-muted flex-shrink-0" />
            <span className="text-sm">{data.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <Gift size={16} className="text-muted flex-shrink-0" />
            <span className="text-sm flex-1">Kode Referral: <span className="font-semibold">{data.referral_code}</span></span>
            <button onClick={copyReferral} className="text-primary-glow">
              <Copy size={14} />
            </button>
          </div>
        </div>

        {/* Riwayat transaksi */}
        <div className="card p-5">
          <div className="font-semibold mb-3">Riwayat Transaksi</div>
          {orders.length === 0 ? (
            <p className="text-muted text-sm text-center py-6">Belum ada transaksi.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => {
                const status = STATUS_LABEL[o.order_status] || { text: o.order_status, color: 'text-muted' };
                return (
                  <div key={o.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{o.product_name}</div>
                      <div className="text-muted text-xs">{o.game_name} · {new Date(o.created_at).toLocaleDateString('id-ID')}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-sm font-semibold">Rp{o.product_price?.toLocaleString('id-ID')}</div>
                      <div className={`text-xs ${status.color}`}>{status.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

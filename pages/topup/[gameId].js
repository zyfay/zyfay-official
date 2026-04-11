// pages/topup/[gameId].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2, CreditCard, Wallet, Building2, Store, ShieldCheck } from 'lucide-react';
import Navbar from '../../components/Navbar';
import LiveChat from '../../components/LiveChat';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function TopUpPage() {
  const router = useRouter();
  const { gameId } = router.query;

  const [game, setGame] = useState(null);
  const [products, setProducts] = useState([]);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!gameId) return;
    fetchData();
  }, [gameId]);

  async function fetchData() {
    const [gameRes, prodRes] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase.from('products').select('*').eq('game_id', gameId).eq('is_active', true).order('sort_order'),
    ]);
    setGame(gameRes.data);
    setProducts(prodRes.data || []);
    setLoading(false);
  }

  async function handleCheckout() {
    if (!selected) return toast.error('Pilih nominal top up');
    for (const f of (game?.fields || [])) {
      if (!form[f.name]) return toast.error(`${f.label} wajib diisi`);
    }
    if (!email) return toast.error('Email wajib diisi');
    if (!userName) return toast.error('Nama wajib diisi');

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          game_name: game.name,
          product_id: selected.id,
          product_name: selected.name,
          product_price: selected.price,
          tv_code: selected.tv_code,
          form_data: form,
          user_email: email,
          user_name: userName,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setOrder(data.order);

      // Open Midtrans Snap
      if (data.snap_token && window.snap) {
        window.snap.pay(data.snap_token, {
          onSuccess: () => {
            toast.success('Pembayaran berhasil!');
            router.push(`/cek-pesanan?id=${data.order.id}`);
          },
          onPending: () => {
            toast('Menunggu pembayaran...', { icon: '⏳' });
            router.push(`/cek-pesanan?id=${data.order.id}`);
          },
          onError: () => toast.error('Pembayaran gagal'),
          onClose: () => {
            toast('Pembayaran dibatalkan', { icon: 'ℹ️' });
            router.push(`/cek-pesanan?id=${data.order.id}`);
          },
        });
      } else {
        // Fallback: redirect ke halaman cek pesanan
        setStep(4);
      }
    } catch (e) {
      toast.error(e.message || 'Gagal membuat pesanan');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-center px-4">
        <div>
          <p className="text-muted mb-4">Game tidak ditemukan</p>
          <Link href="/" className="btn-primary inline-flex">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Top Up {game.name} | {process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay'}</title>
      </Head>
      {/* Midtrans Snap JS */}
      <script
        type="text/javascript"
        src={
          process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js'
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
      />

      <div className="min-h-screen bg-bg">
        <Navbar />

        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/" className="btn-ghost text-sm mb-6 inline-flex">
            <ArrowLeft size={16} /> Kembali
          </Link>

          {/* Game banner */}
          <div
            className="rounded-2xl p-6 mb-6 flex items-center gap-4 border border-border"
            style={{ background: gameGradient(gameId) }}
          >
            {game.image_url ? (
              <img src={game.image_url} alt={game.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center font-display text-2xl font-black text-white/30">
                {game.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold">{game.name}</h1>
              <p className="text-white/50 text-sm">{game.publisher}</p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1 mb-8">
            {['Nominal', 'Data Akun', 'Bayar'].map((label, i) => (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-primary text-white' : 'bg-card text-muted border border-border'
                }`}>
                  {step > i + 1 ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${step === i + 1 ? 'text-white' : 'text-muted'}`}>{label}</span>
                {i < 2 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-emerald-500' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1 - Select Nominal */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-4">Pilih Nominal</h2>
              {products.length === 0 ? (
                <div className="card p-8 text-center text-muted">
                  <p>Produk belum tersedia untuk game ini.</p>
                  <p className="text-xs mt-1">Silakan hubungi admin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selected?.id === p.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/40'
                      }`}
                    >
                      {p.image_url && (
                        <img src={p.image_url} alt={p.name} className="w-full h-20 object-cover rounded-lg mb-2" />
                      )}
                      <div className="font-semibold text-sm text-white">{p.name}</div>
                      {p.metadata?.bonus && (
                        <div className="text-emerald-400 text-xs mt-0.5">+{p.metadata.bonus} Bonus</div>
                      )}
                      <div className="text-primary-glow font-bold mt-1">
                        Rp {p.price.toLocaleString('id-ID')}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => selected ? setStep(2) : toast.error('Pilih nominal terlebih dahulu')}
                className="btn-primary w-full"
              >
                Lanjut
              </button>
            </div>
          )}

          {/* Step 2 - Account Data */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-4">Data Akun</h2>
              <div className="card p-4 mb-4 flex justify-between items-center">
                <div>
                  <div className="text-muted text-xs">Produk dipilih</div>
                  <div className="font-semibold">{selected.name}</div>
                </div>
                <div className="text-primary-glow font-bold">Rp {selected.price.toLocaleString('id-ID')}</div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nama Lengkap</label>
                  <input type="text" placeholder="Nama kamu" value={userName} onChange={e => setUserName(e.target.value)} className="input-field" />
                </div>
                {(game.fields || []).map((f) => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                    <input type="text" placeholder={f.placeholder} value={form[f.name] || ''} onChange={e => setForm({ ...form, [f.name]: e.target.value })} className="input-field" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email (notifikasi)</label>
                  <input type="email" placeholder="email@kamu.com" value={email} onChange={e => setEmail(e.target.value)} className="input-field" />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Kembali</button>
                <button onClick={() => setStep(3)} className="btn-primary flex-1">Lanjut</button>
              </div>
            </div>
          )}

          {/* Step 3 - Payment */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-4">Konfirmasi & Bayar</h2>

              <div className="card p-4 mb-6 space-y-3">
                <div className="font-semibold text-muted text-xs uppercase tracking-wider">Ringkasan Pesanan</div>
                {[
                  { l: 'Game', v: game.name },
                  { l: 'Produk', v: selected.name },
                  ...Object.entries(form).map(([k, v]) => ({ l: k.replace('_', ' '), v })),
                  { l: 'Email', v: email },
                ].map((row) => (
                  <div key={row.l} className="flex justify-between text-sm">
                    <span className="text-muted capitalize">{row.l}</span>
                    <span className="font-medium">{row.v}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-3 flex justify-between font-bold">
                  <span>Total Bayar</span>
                  <span className="text-primary-glow text-lg">Rp {selected.price.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="card p-4 mb-6 flex items-center gap-3">
                <ShieldCheck size={20} className="text-primary-glow flex-shrink-0" />
                <div className="text-sm text-muted">
                  Pembayaran diproses oleh <strong className="text-white">Midtrans</strong> — aman dan terenkripsi. Tersedia QRIS, GoPay, OVO, DANA, VA Bank, Minimarket.
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Kembali</button>
                <button onClick={handleCheckout} disabled={submitting} className="btn-primary flex-1">
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : <><CreditCard size={16} /> Bayar Sekarang</>}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 - Success fallback */}
          {step === 4 && order && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-primary-glow" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Pesanan Dibuat!</h2>
              <p className="text-muted mb-2">ID Pesanan: <span className="text-primary-glow font-mono font-bold">{order.id}</span></p>
              <p className="text-muted text-sm mb-6">Notifikasi akan dikirim ke {email}</p>
              <div className="flex gap-3 justify-center">
                <Link href={`/cek-pesanan?id=${order.id}`} className="btn-primary">Cek Status</Link>
                <Link href="/" className="btn-secondary">Beranda</Link>
              </div>
            </div>
          )}
        </div>

        <LiveChat />
      </div>
    </>
  );
}

function gameGradient(id) {
  const map = {
    mlbb: 'linear-gradient(135deg,#1a3a5a,#0d1a2e)',
    ff: 'linear-gradient(135deg,#5a1a00,#1a0500)',
    pubg: 'linear-gradient(135deg,#3a2a00,#1a1000)',
    valorant: 'linear-gradient(135deg,#3a0a15,#1a0510)',
    genshin: 'linear-gradient(135deg,#2a1a5a,#0d0520)',
    honkai: 'linear-gradient(135deg,#0a1a5a,#050d20)',
  };
  return map[id] || 'linear-gradient(135deg,#1A1630,#0A0A12)';
}

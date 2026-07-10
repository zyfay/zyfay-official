// pages/topup/[gameId].js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Loader2, CreditCard, ShieldCheck, Flame, Clock } from 'lucide-react';
import Navbar from '../../components/Navbar';
import LiveChat from '../../components/LiveChat';
import { supabase } from '../../lib/supabase';
import { addToHistory } from '../../lib/orderHistory';
import { PAYMENT_METHODS, getPaymentMethod } from '../../lib/paymentMethods';
import toast from 'react-hot-toast';

export default function TopUpPage() {
  const router = useRouter();
  const { gameId } = router.query;

  const [game, setGame] = useState(null);
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const lanjutRef = useRef(null);

  useEffect(() => {
    if (!gameId) return;
    fetchData();
    fetchFlashSales();
  }, [gameId]);

  // Ticker buat countdown & biar diskon otomatis nonaktif real-time kalau udah lewat waktu.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function fetchData() {
    const [gameRes, prodRes] = await Promise.all([
      supabase.from('games').select('*').eq('id', gameId).single(),
      supabase.from('products').select('*').eq('game_id', gameId).eq('is_active', true).order('sort_order'),
    ]);
    setGame(gameRes.data);
    setProducts(prodRes.data || []);
    setLoading(false);
  }

  async function fetchFlashSales() {
    try {
      const res = await fetch('/api/flash-sales');
      const data = await res.json();
      setFlashSales(data.flash_sales || []);
    } catch (e) { console.error(e); }
  }

  function getFlashSale(productId) {
    const fs = flashSales.find(f => f.product_id === productId);
    if (!fs) return null;
    if (new Date(fs.ends_at).getTime() <= now) return null; // expired real-time, gak nunggu refresh
    return fs;
  }

  function effectivePrice(p) {
    const fs = getFlashSale(p.id);
    return fs ? fs.sale_price : p.price;
  }

  function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function handleSelectProduct(p) {
    setSelected(p);
    // Kebanyakan produk bikin tombol "Lanjut" ke-scroll di luar layar, jadi
    // auto-scroll ke tombolnya biar user gak perlu geser manual.
    setTimeout(() => {
      lanjutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  // Validasi step 2
  function validateStep2() {
    for (const f of (game?.fields || [])) {
      if (!form[f.name]?.trim()) {
        toast.error(`${f.label} wajib diisi`);
        return false;
      }
    }
    if (!email?.trim()) {
      toast.error('Email wajib diisi');
      return false;
    }
    // validasi format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Format email tidak valid');
      return false;
    }
    return true;
  }

  async function handleCheckout() {
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
          product_price: effectivePrice(selected),
          tv_code: selected.tv_code,
          form_data: form,
          user_email: email,
          user_name: email,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      addToHistory({
        id: data.order.id,
        game_name: game.name,
        product_name: selected.name,
        product_price: effectivePrice(selected),
        created_at: data.order.created_at || new Date().toISOString(),
      });
      toast.success(
        data.duplicate
          ? 'Kamu masih punya pesanan yang belum dibayar untuk produk ini, lanjutin yuk!'
          : 'Pesanan dibuat! Silakan scan QR untuk membayar.'
      );
      router.push(`/bayar/${data.order.id}`);
    } catch (e) {
      toast.error(e.message || 'Gagal membuat pesanan');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="text-primary animate-spin" />
    </div>
  );

  if (!game) return (
    <div className="min-h-screen bg-bg flex items-center justify-center text-center px-4">
      <div>
        <p className="text-muted mb-4">Game tidak ditemukan</p>
        <Link href="/" className="btn-primary inline-flex">Kembali ke Beranda</Link>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Top Up {game.name} | {process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay'}</title>
      </Head>

      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href="/" className="btn-ghost text-sm mb-6 inline-flex">
            <ArrowLeft size={16} /> Kembali
          </Link>

          {/* Game banner */}
          <div className="rounded-2xl p-6 mb-6 flex items-center gap-4 border border-border"
            style={{ background: gameGradient(gameId) }}>
            {game.image_url
              ? <img src={game.image_url} alt={game.name} className="w-16 h-16 rounded-xl object-cover" />
              : <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center font-display text-2xl font-black text-white/30">
                  {game.name.slice(0, 2).toUpperCase()}
                </div>
            }
            <div>
              <h1 className="font-display text-2xl font-bold">{game.name}</h1>
              <p className="text-white/50 text-sm">{game.publisher}</p>
            </div>
          </div>

          {/* Steps */}
          {step < 4 && (
            <div className="flex items-center gap-1 mb-8">
              {['Nominal', 'Data Akun', 'Konfirmasi'].map((label, i) => (
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
          )}

          {/* Step 1 - Pilih Nominal */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-4">Pilih Nominal</h2>
              {products.length === 0
                ? <div className="card p-8 text-center text-muted">
                    <p>Produk belum tersedia untuk game ini.</p>
                    <p className="text-xs mt-1">Silakan hubungi admin.</p>
                  </div>
                : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {products.map(p => {
                      const fs = getFlashSale(p.id);
                      const price = effectivePrice(p);
                      return (
                        <button key={p.id} onClick={() => handleSelectProduct(p)}
                          className={`relative p-4 rounded-xl border text-left transition-all ${
                            selected?.id === p.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-card hover:border-primary/40'
                          }`}>
                          {fs && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 z-10">
                              <Flame size={9} fill="white" /> -{Math.round((1 - fs.sale_price / p.price) * 100)}%
                            </div>
                          )}
                          <div className="font-semibold text-sm text-white">{p.name}</div>
                          {p.metadata?.bonus && (
                            <div className="text-emerald-400 text-xs mt-0.5">+{p.metadata.bonus} Bonus</div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-primary-glow font-bold">Rp {price.toLocaleString('id-ID')}</span>
                            {fs && <span className="text-muted/60 text-xs line-through">Rp {p.price.toLocaleString('id-ID')}</span>}
                          </div>
                          {fs && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-mono">
                              <Clock size={10} /> {formatCountdown(new Date(fs.ends_at).getTime() - now)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
              }
              <button
                ref={lanjutRef}
                onClick={() => selected ? setStep(2) : toast.error('Pilih nominal terlebih dahulu')}
                className="btn-primary w-full"
              >
                Lanjut
              </button>
            </div>
          )}

          {/* Step 2 - Data Akun */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-4">Data Akun</h2>
              <div className="card p-4 mb-4 flex justify-between items-center">
                <div>
                  <div className="text-muted text-xs">Produk dipilih</div>
                  <div className="font-semibold">{selected.name}</div>
                </div>
                <div className="text-primary-glow font-bold">
                  Rp {effectivePrice(selected).toLocaleString('id-ID')}
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {(game.fields || []).map(f => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium mb-1.5">{f.label}</label>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={form[f.name] || ''}
                      onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                      className="input-field"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email (untuk notifikasi)</label>
                  <input
                    type="email"
                    placeholder="email@kamu.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">Kembali</button>
                <button
                  onClick={() => { if (validateStep2()) setStep(3); }}
                  className="btn-primary flex-1"
                >
                  Lanjut
                </button>
              </div>
            </div>
          )}

          {/* Step 3 - Konfirmasi */}
          {step === 3 && (
            <div>
              <h2 className="font-display text-xl font-bold mb-4">Konfirmasi Pesanan</h2>

              <div className="card p-4 mb-5 space-y-2.5">
                <div className="font-semibold text-muted text-xs uppercase tracking-wider mb-3">
                  Ringkasan Pesanan
                </div>
                {[
                  { l: 'Game', v: game.name },
                  { l: 'Produk', v: selected.name },
                  ...Object.entries(form).map(([k, v]) => ({ l: k.replace('_', ' '), v })),
                  { l: 'Email', v: email },
                ].map(row => (
                  <div key={row.l} className="flex justify-between text-sm">
                    <span className="text-muted capitalize">{row.l}</span>
                    <span className="font-medium">{row.v}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-3 flex justify-between font-bold">
                  <span>Total Bayar</span>
                  <span className="text-primary-glow text-lg">
                    Rp {effectivePrice(selected).toLocaleString('id-ID')}
                  </span>
                </div>
                {getFlashSale(selected.id) && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Hemat dari ZySale</span>
                    <span>Rp {(selected.price - effectivePrice(selected)).toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <div className="font-semibold text-sm mb-2.5">Pilih Metode Pembayaran</div>
                <div className="space-y-2">
                  {PAYMENT_METHODS.filter(m => m.type === 'qris').map(m => (
                    <button
                      key={m.code}
                      onClick={() => setPaymentMethod(m.code)}
                      className={`w-full card p-4 flex items-center gap-3 text-left transition-all ${
                        paymentMethod === m.code ? 'border-primary bg-primary/10' : 'hover:border-primary/40'
                      }`}
                    >
                      <div className="w-10 h-10 bg-pink-500/15 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-pink-400 text-sm">
                        QR
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{m.label}</div>
                        <div className="text-muted text-xs">{m.desc}</div>
                      </div>
                      <span className="badge badge-success">Instan</span>
                    </button>
                  ))}
                </div>

                <div className="text-muted text-xs uppercase tracking-wider mt-4 mb-2">Virtual Account</div>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.filter(m => m.type === 'va').map(m => (
                    <button
                      key={m.code}
                      onClick={() => setPaymentMethod(m.code)}
                      className={`card p-3 flex items-center gap-2.5 text-left transition-all ${
                        paymentMethod === m.code ? 'border-primary bg-primary/10' : 'hover:border-primary/40'
                      }`}
                    >
                      <div className="w-8 h-8 bg-sky-500/15 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sky-400 text-[10px]">
                        VA
                      </div>
                      <div className="font-medium text-xs truncate">{m.bank}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-4 mb-5 flex items-start gap-3">
                <ShieldCheck size={18} className="text-primary-glow flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted">
                  Pembayaran diproses oleh <strong className="text-white">Pakasir</strong> — aman & terenkripsi.
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">Kembali</button>
                <button onClick={handleCheckout} disabled={submitting} className="btn-primary flex-1">
                  {submitting
                    ? <><Loader2 size={16} className="animate-spin" /> Memproses...</>
                    : <><CreditCard size={16} /> Bayar {getPaymentMethod(paymentMethod).label}</>
                  }
                </button>
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
    mlbb:     'linear-gradient(135deg,#1a3a5a,#0d1a2e)',
    ff:       'linear-gradient(135deg,#5a1a00,#1a0500)',
    pubg:     'linear-gradient(135deg,#3a2a00,#1a1000)',
    valorant: 'linear-gradient(135deg,#3a0a15,#1a0510)',
    genshin:  'linear-gradient(135deg,#2a1a5a,#0d0520)',
    honkai:   'linear-gradient(135deg,#0a1a5a,#050d20)',
  };
  return map[id] || 'linear-gradient(135deg,#1A1630,#0A0A12)';
}

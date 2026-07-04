// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  Search, Flame, Smartphone, Monitor, ChevronRight, ChevronLeft, Zap, Shield,
  BadgeDollarSign, Star, Ticket, Gamepad2, Clock, PackageSearch, ImageIcon,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import LiveChat from '../components/LiveChat';
import { supabase } from '../lib/supabase';

const PAGE_SIZE = 8;

export default function Home() {
  const [games, setGames] = useState([]);
  const [banners, setBanners] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [otherProducts, setOtherProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  useEffect(() => {
    fetchGames();
    fetchBanners();
    fetchFlashSales();
    fetchOtherProducts();
  }, []);

  useEffect(() => { setPage(0); }, [search, tab]);

  async function fetchGames() {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    setGames(data || []);
    setLoading(false);
  }

  async function fetchBanners() {
    try {
      const res = await fetch('/api/banners');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch (e) { console.error(e); }
  }

  async function fetchFlashSales() {
    try {
      const res = await fetch('/api/flash-sales');
      const data = await res.json();
      setFlashSales(data.flash_sales || []);
    } catch (e) { console.error(e); }
  }

  async function fetchOtherProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .is('game_id', null)
      .eq('is_active', true)
      .order('sort_order')
      .limit(6);
    setOtherProducts(data || []);
  }

  const filtered = games.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    if (tab === 'all') return matchSearch;
    if (tab === 'trending') return matchSearch && g.is_trending;
    return matchSearch && g.category === tab;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const tabs = [
    { id: 'all', label: 'Semua', icon: <Star size={14} /> },
    { id: 'trending', label: 'Trending', icon: <Flame size={14} /> },
    { id: 'mobile', label: 'Mobile', icon: <Smartphone size={14} /> },
    { id: 'voucher', label: 'Voucher', icon: <Ticket size={14} /> },
    { id: 'pc', label: 'Pc / Console', icon: <Monitor size={14} /> },
    { id: 'steam', label: 'Steam', icon: <Gamepad2 size={14} /> },
  ];

  return (
    <>
      <Head>
        <title>{siteName} — Top Up Game Tercepat</title>
        <meta name="description" content="Top up game murah, cepat, terpercaya. ML, Free Fire, PUBG, Valorant dan 100+ game." />
      </Head>

      <div className="min-h-screen bg-bg">
        <Navbar />

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Pill */}
          <div className="flex justify-center mb-4">
            <div className="bg-primary text-white text-sm font-semibold rounded-full px-5 py-2 shadow-glow">
              Topup secepat kilat!
            </div>
          </div>

          {/* Carousel */}
          <BannerCarousel banners={banners} fallbackGames={games.filter(g => g.is_trending).slice(0, 5)} />

          {/* ZySale */}
          <div className="mt-10">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/15 border border-primary/30 text-primary-glow font-display italic font-bold text-lg rounded-full px-6 py-1.5">
                ZySale!
              </div>
            </div>

            {flashSales.length === 0 ? (
              <div className="card p-8 text-center text-muted">
                <Flame size={30} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada flash sale saat ini</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {flashSales.slice(0, 4).map(fs => (
                  <FlashSaleCard key={fs.id} sale={fs} />
                ))}
              </div>
            )}
          </div>

          {/* Produk Zyfay Lainnya */}
          <div className="mt-10">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/15 border border-primary/30 text-primary-glow font-display italic font-bold text-lg rounded-full px-6 py-1.5">
                Produk zyfay lainnya...
              </div>
            </div>

            <Link href="/produk-lainnya" className="card block p-5 hover:border-primary/40 transition-colors relative">
              <ChevronRight size={20} className="absolute top-4 right-4 text-muted" />
              {otherProducts.length === 0 ? (
                <div className="flex items-center gap-3 text-muted py-4">
                  <PackageSearch size={28} className="opacity-40 flex-shrink-0" />
                  <span className="text-sm">Belum ada produk yang ditampilkan.</span>
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pr-6">
                  {otherProducts.map(p => (
                    <div key={p.id} className="flex-shrink-0 w-32 bg-card-hover rounded-xl p-2.5">
                      <div className="w-full aspect-square bg-card rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          : <ImageIcon size={20} className="text-muted" />}
                      </div>
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      <div className="text-primary-glow text-xs font-bold mt-0.5">Rp {p.price?.toLocaleString('id-ID')}</div>
                    </div>
                  ))}
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="border-y border-border bg-surface mt-4">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-around gap-4">
            {[
              { v: '2.5 Juta+', l: 'Transaksi Sukses' },
              { v: '100+', l: 'Game Tersedia' },
              { v: '500K+', l: 'Member Aktif' },
              { v: '4.9 / 5', l: 'Rating Pengguna' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-display text-2xl font-bold text-primary-glow">{s.v}</div>
                <div className="text-muted text-xs mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Games */}
        <div className="max-w-6xl mx-auto px-4 py-10" id="games">
          {/* Search */}
          <div className="relative max-w-lg mx-auto mb-6">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Cari game..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-6 max-w-lg mx-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-primary text-white'
                    : 'bg-card text-muted hover:text-white border border-border'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="skeleton aspect-square rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Search size={40} className="text-muted mx-auto mb-3" />
              <p className="text-muted">Game tidak ditemukan</p>
            </div>
          ) : (
            <GamesSlider filtered={filtered} page={page} setPage={setPage} totalPages={totalPages} />
          )}

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-4 mt-16">
            {[
              { icon: <Zap size={22} className="text-primary-glow" />, title: 'Proses Instan', desc: 'Diamond langsung masuk ke akun dalam hitungan detik setelah pembayaran.' },
              { icon: <Shield size={22} className="text-primary-glow" />, title: 'Aman & Terpercaya', desc: 'Transaksi diamankan dengan enkripsi SSL. 2 juta+ transaksi berhasil.' },
              { icon: <BadgeDollarSign size={22} className="text-primary-glow" />, title: 'Harga Terbaik', desc: 'Harga kompetitif dengan banyak pilihan metode pembayaran.' },
            ].map((f) => (
              <div key={f.title} className="card p-6">
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-muted text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-surface mt-10 py-8">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="flex items-center gap-2 justify-center mb-2">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <Zap size={14} className="text-white" fill="white" />
              </div>
              <span className="font-display text-xl font-bold text-white">{siteName}</span>
            </div>
            <p className="text-muted text-sm">Top Up Game Terpercaya · Harga Terbaik · Transaksi Aman</p>
            <div className="flex justify-center gap-4 mt-4 text-muted text-sm flex-wrap">
              <a href="#" className="hover:text-white transition-colors">Tentang Kami</a>
              <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
              <Link href="/cek-pesanan" className="hover:text-white transition-colors">Cek Pesanan</Link>
            </div>
            <p className="text-muted/40 text-xs mt-4">© {new Date().getFullYear()} {siteName}. All Rights Reserved.</p>
          </div>
        </footer>

        <LiveChat />
      </div>
    </>
  );
}

function GamesSlider({ filtered, page, setPage, totalPages }) {
  const startX = useRef(0);
  const startY = useRef(0);
  const axisLocked = useRef(null); // 'x' | 'y' | null
  const [direction, setDirection] = useState(1);

  function onTouchStart(e) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    axisLocked.current = null;
  }

  function onTouchMove(e) {
    if (axisLocked.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    // Baru kunci arah gestur setelah gerakannya cukup jelas (>10px), dan
    // cuma dianggap swipe horizontal kalau gerakan menyampingnya jelas
    // lebih dominan daripada gerakan naik/turun (bukan scroll biasa).
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      axisLocked.current = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'x' : 'y';
    }
  }

  function onTouchEnd(e) {
    if (axisLocked.current !== 'x') { axisLocked.current = null; return; }
    const dx = e.changedTouches[0].clientX - startX.current;
    const threshold = 60;
    if (dx < -threshold && page < totalPages - 1) {
      setDirection(1);
      setPage(p => p + 1);
    } else if (dx > threshold && page > 0) {
      setDirection(-1);
      setPage(p => p - 1);
    }
    axisLocked.current = null;
  }

  const paged = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div
        className="overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          key={page}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4"
          style={{ animation: `zySlideIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)`, '--zy-dir': direction }}
        >
          {paged.map((game) => (
            <Link key={game.id} href={`/topup/${game.id}`}>
              <div className="card-hover rounded-2xl overflow-hidden">
                <div
                  className="aspect-square flex items-center justify-center relative"
                  style={{ background: gameGradient(game.id) }}
                >
                  {game.image_url ? (
                    <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" draggable={false} />
                  ) : (
                    <div className="font-display text-5xl font-black text-white/20">
                      {game.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  {game.is_trending && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame size={9} fill="white" /> HOT
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-semibold text-sm text-white truncate">{game.name}</div>
                  <div className="text-muted text-xs mt-0.5 truncate">{game.publisher}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Dot pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > page ? 1 : -1); setPage(i); }}
              aria-label={`Halaman ${i + 1}`}
              className={`rounded-full transition-all ${
                page === i ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-border hover:bg-muted'
              }`}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes zySlideIn {
          from { opacity: 0; transform: translateX(calc(var(--zy-dir) * 24px)); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function BannerCarousel({ banners, fallbackGames }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef();

  // Prioritaskan banner yang diatur admin; kalau kosong, pakai game trending sebagai default.
  const usingBanners = banners && banners.length > 0;
  const slides = usingBanners
    ? banners
    : (fallbackGames.length > 0 ? fallbackGames : [null]);

  useEffect(() => {
    setIndex(0);
  }, [banners, fallbackGames]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  function go(delta) {
    clearInterval(timerRef.current);
    setIndex(i => (i + delta + slides.length) % slides.length);
  }

  const current = slides[index];

  return (
    <div className="relative max-w-2xl mx-auto">
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-border">
        {current ? (
          usingBanners ? (
            <div className="w-full h-full relative bg-card">
              <img src={current.image_url} alt={current.title || 'Banner'} className="w-full h-full object-cover" />
              {(current.title || current.subtitle) && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              )}
              {(current.title || current.subtitle || current.link_url) && (
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <div>
                    {current.title && <div className="text-white font-display font-bold text-lg drop-shadow">{current.title}</div>}
                    {current.subtitle && <div className="text-white/70 text-xs">{current.subtitle}</div>}
                  </div>
                  {current.link_url && (
                    <Link href={current.link_url} className="btn-primary text-xs px-4 py-2 flex-shrink-0">
                      {current.button_label || 'MULAI'}
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full relative" style={{ background: gameGradient(current.id) }}>
              {current.image_url && (
                <img src={current.image_url} alt={current.name} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div>
                  <div className="text-white font-display font-bold text-lg drop-shadow">{current.name}</div>
                  <div className="text-white/70 text-xs">{current.publisher}</div>
                </div>
                <Link href={`/topup/${current.id}`} className="btn-primary text-xs px-4 py-2 flex-shrink-0">
                  MULAI
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-card text-muted text-sm">
            Belum ada banner
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
            <ChevronRight size={18} />
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { clearInterval(timerRef.current); setIndex(i); }}
                className={`rounded-full transition-all ${i === index ? 'w-5 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-border'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FlashSaleCard({ sale }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(sale.ends_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Berakhir'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [sale.ends_at]);

  const p = sale.product;
  const discount = p.original_price > sale.sale_price
    ? Math.round((1 - sale.sale_price / p.original_price) * 100)
    : Math.round((1 - sale.sale_price / p.price) * 100);

  return (
    <Link href={p.game_id ? `/topup/${p.game_id}` : '/produk-lainnya'} className="card-hover rounded-2xl overflow-hidden relative">
      {discount > 0 && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
          -{discount}%
        </div>
      )}
      <div className="aspect-square bg-card-hover flex items-center justify-center">
        {sale.image_url
          ? <img src={sale.image_url} alt={p.name} className="w-full h-full object-cover" />
          : <ImageIcon size={26} className="text-muted" />}
      </div>
      <div className="p-2.5">
        <div className="text-xs font-medium truncate">{p.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-primary-glow text-xs font-bold">Rp {sale.sale_price.toLocaleString('id-ID')}</span>
        </div>
        <div className="text-muted/60 text-[10px] line-through">Rp {p.price.toLocaleString('id-ID')}</div>
        <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-1 font-mono">
          <Clock size={10} /> {timeLeft}
        </div>
      </div>
    </Link>
  );
}

function gameGradient(id) {
  const map = {
    mlbb: 'linear-gradient(135deg,#1a6b8a,#0d2040)',
    ff: 'linear-gradient(135deg,#b94a00,#1a0a00)',
    pubg: 'linear-gradient(135deg,#9a7a10,#1a1000)',
    valorant: 'linear-gradient(135deg,#8b1a2a,#1a0510)',
    genshin: 'linear-gradient(135deg,#4a1f8a,#0d0520)',
    honkai: 'linear-gradient(135deg,#1a3a8a,#050d20)',
  };
  return map[id] || 'linear-gradient(135deg,#2D2650,#0A0A12)';
}

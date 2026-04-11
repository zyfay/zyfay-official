// pages/index.js
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Search, Flame, Smartphone, Monitor, ChevronRight, Zap, Shield, BadgeDollarSign, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import LiveChat from '../components/LiveChat';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [games, setGames] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  useEffect(() => {
    fetchGames();
  }, []);

  async function fetchGames() {
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    setGames(data || []);
    setLoading(false);
  }

  const filtered = games.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    if (tab === 'all') return matchSearch;
    if (tab === 'trending') return matchSearch && g.is_trending;
    return matchSearch && g.category === tab;
  });

  const tabs = [
    { id: 'all', label: 'Semua', icon: <Star size={14} /> },
    { id: 'trending', label: 'Trending', icon: <Flame size={14} /> },
    { id: 'mobile', label: 'Mobile', icon: <Smartphone size={14} /> },
    { id: 'pc', label: 'PC / Console', icon: <Monitor size={14} /> },
  ];

  return (
    <>
      <Head>
        <title>{siteName} — Top Up Game Tercepat</title>
        <meta name="description" content="Top up game murah, cepat, terpercaya. ML, Free Fire, PUBG, Valorant dan 100+ game." />
      </Head>

      <div className="min-h-screen bg-bg">
        <Navbar />

        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute top-20 left-10 w-40 h-40 bg-primary-glow/10 rounded-full blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary-glow rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Flame size={14} /> Bonus 400% untuk Member Baru
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold text-white mb-4 leading-tight">
              Top Up Game<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-light to-primary-glow">
                Tercepat & Termurah
              </span>
            </h1>
            <p className="text-muted text-lg mb-8 max-w-md mx-auto">
              100+ game tersedia. Transaksi instan, harga terbaik, pembayaran otomatis.
            </p>
            <div className="flex gap-3 justify-center">
              <a href="#games" className="btn-primary px-8 py-3.5">
                Mulai Top Up <ChevronRight size={16} />
              </a>
              <Link href="/cek-pesanan" className="btn-secondary px-8 py-3.5">
                Cek Pesanan
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="border-y border-border bg-surface">
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
          <div className="relative max-w-lg mx-auto mb-8">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Cari game..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
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
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((game) => (
                <Link key={game.id} href={`/topup/${game.id}`}>
                  <div className="card-hover rounded-2xl overflow-hidden">
                    <div
                      className="aspect-square flex items-center justify-center relative"
                      style={{ background: gameGradient(game.id) }}
                    >
                      {game.image_url ? (
                        <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" />
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

              {filtered.length === 0 && (
                <div className="col-span-full text-center py-20">
                  <Search size={40} className="text-muted mx-auto mb-3" />
                  <p className="text-muted">Game tidak ditemukan</p>
                </div>
              )}
            </div>
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
            <p className="text-muted/40 text-xs mt-4">© {new Date().getFullYear()} {siteName}. Powered by TokoVoucher & Midtrans.</p>
          </div>
        </footer>

        <LiveChat />
      </div>
    </>
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

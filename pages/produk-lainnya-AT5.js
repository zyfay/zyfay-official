// pages/produk-lainnya.js
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowLeft, Search, PackageSearch, ImageIcon, MessageCircle, LayoutGrid } from 'lucide-react';
import Navbar from '../components/Navbar';
import LiveChat from '../components/LiveChat';
import { supabase } from '../lib/supabase';

export default function ProdukLainnya() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [loading, setLoading] = useState(true);
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  useEffect(() => { load(); loadCategories(); }, []);

  async function load() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .is('game_id', null)
      .eq('is_active', true)
      .order('sort_order');
    setProducts(data || []);
    setLoading(false);
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/product-categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) { console.error(e); }
  }

  function handleOrderChat(product) {
    // Kasih tau admin lewat chat produk apa yang mau ditanyain, biar gak perlu ketik ulang
    window.dispatchEvent(new CustomEvent('zyfay:chat-prefill', {
      detail: `Halo, saya mau tanya/pesan produk "${product.name}" ya`,
    }));
    document.querySelector('[data-livechat-trigger]')?.click();
  }

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p => activeCat === 'all' || p.shop_category_id === activeCat);

  return (
    <>
      <Head><title>Produk Zyfay Lainnya | {siteName}</title></Head>
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/" className="btn-ghost text-sm mb-6 inline-flex"><ArrowLeft size={16} /> Kembali</Link>

          <h1 className="font-display text-2xl font-bold mb-1">Produk Zyfay Lainnya</h1>
          <p className="text-muted text-sm mb-6">Akun game, voucher, sosial media, dan produk lain di luar top up game</p>

          <div className="relative max-w-md mb-5">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '2.75rem' }}
            />
          </div>

          {categories.length > 0 && (
            <div className="flex gap-2 mb-8 flex-wrap">
              <button
                onClick={() => setActiveCat('all')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeCat === 'all' ? 'bg-primary text-white' : 'bg-card text-muted hover:text-white border border-border'
                }`}
              >
                <LayoutGrid size={14} /> Semua
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeCat === c.id ? 'bg-primary text-white' : 'bg-card text-muted hover:text-white border border-border'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton aspect-square rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-10 text-center text-muted">
              <PackageSearch size={36} className="mx-auto mb-3 opacity-30" />
              <p>Belum ada produk yang ditampilkan di sini.</p>
              <p className="text-xs mt-1">Cek lagi nanti ya, atau hubungi admin lewat live chat.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map(p => (
                <div key={p.id} className="card rounded-2xl overflow-hidden">
                  <div className="aspect-square bg-card-hover flex items-center justify-center">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      : <ImageIcon size={26} className="text-muted" />}
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    {p.description && <div className="text-muted text-xs mt-0.5 truncate">{p.description}</div>}
                    <div className="text-primary-glow font-bold text-sm mt-1.5">Rp {p.price.toLocaleString('id-ID')}</div>
                    <button
                      onClick={() => handleOrderChat(p)}
                      className="btn-secondary w-full text-xs mt-3 py-2"
                    >
                      <MessageCircle size={13} /> Pesan via Chat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <LiveChat />
      </div>
    </>
  );
}

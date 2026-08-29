// pages/produk-lainnya.js
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, PackageSearch, ImageIcon, MessageCircle, LayoutGrid, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import Navbar from '../components/Navbar';
import LiveChat from '../components/LiveChat';

export default function ProdukLainnya() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // produk yang lagi dibuka detailnya
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  useEffect(() => { load(); loadCategories(); }, []);

  async function load() {
    try {
      const res = await fetch('/api/shop-products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/product-categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) { console.error(e); }
  }

  function handleOrderChat(product) {
    window.dispatchEvent(new CustomEvent('zyfay:chat-prefill', {
      detail: `Halo, saya mau tanya/pesan produk "${product.title}" ya`,
    }));
    document.querySelector('[data-livechat-trigger]')?.click();
  }

  const filtered = products
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    .filter(p => activeCat === 'all' || p.category_id === activeCat);

  return (
    <>
      <Head><title>Produk Zyfay Lainnya | {siteName}</title></Head>
      <div className="min-h-screen bg-bg">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/" className="btn-ghost text-sm mb-6 inline-flex"><ArrowLeft size={16} /> Kembali</Link>

          <h1 className="font-display text-2xl font-bold mb-1">Produk Zyfay Lainnya</h1>
          <p className="text-muted text-sm mb-6">Akun game, jasa media sosial, dan produk lain di luar top up game</p>

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
              {filtered.map(p => {
                const cover = p.shop_product_images?.[0]?.image_url;
                return (
                  <button key={p.id} onClick={() => setDetail(p)} className="card rounded-2xl overflow-hidden text-left">
                    <div className="aspect-square bg-card-hover flex items-center justify-center relative">
                      {cover
                        ? <img src={cover} alt={p.title} className="w-full h-full object-cover" />
                        : <ImageIcon size={26} className="text-muted" />}
                      {p.shop_product_images?.length > 1 && (
                        <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                          {p.shop_product_images.length} foto
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-semibold text-sm truncate">{p.title}</div>
                      <div className="text-primary-glow font-bold text-sm mt-1.5">Rp {p.price.toLocaleString('id-ID')}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {detail && (
          <ProductDetailModal
            product={detail}
            onClose={() => setDetail(null)}
            onOrder={() => { handleOrderChat(detail); setDetail(null); }}
          />
        )}

        <LiveChat />
      </div>
    </>
  );
}

function ProductDetailModal({ product, onClose, onOrder }) {
  const images = product.shop_product_images || [];
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  function go(delta) {
    setIndex(i => Math.min(images.length - 1, Math.max(0, i + delta)));
  }

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setDragging(true);
  }
  function onTouchMove(e) {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    setDragOffset(touchDeltaX.current);
  }
  function onTouchEnd() {
    setDragging(false);
    const threshold = 50;
    if (touchDeltaX.current < -threshold) go(1);
    else if (touchDeltaX.current > threshold) go(-1);
    touchDeltaX.current = 0;
    setDragOffset(0);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Galeri */}
        <div className="relative bg-black aspect-square">
          {images.length > 0 ? (
            <>
              <div
                className="w-full h-full overflow-hidden"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                <div
                  className="flex h-full"
                  style={{
                    transform: `translateX(calc(-${index * 100}% + ${dragOffset}px))`,
                    transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {images.map((img, i) => (
                    <div key={img.id} className="w-full h-full flex-shrink-0 flex items-center justify-center">
                      <img
                        src={img.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover cursor-zoom-in"
                        draggable={false}
                        onClick={() => setZoomed(true)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setZoomed(true)}
                className="absolute top-3 right-3 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ZoomIn size={16} />
              </button>

              {images.length > 1 && (
                <>
                  {index > 0 && (
                    <button onClick={() => go(-1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
                      <ChevronLeft size={18} />
                    </button>
                  )}
                  {index < images.length - 1 && (
                    <button onClick={() => go(1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  )}
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`rounded-full transition-all ${i === index ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted">
              <ImageIcon size={40} />
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Detail */}
        <div className="p-5">
          <h2 className="font-display text-xl font-bold mb-1">{product.title}</h2>
          {product.product_categories?.name && (
            <span className="badge badge-purple mb-3 inline-block">{product.product_categories.name}</span>
          )}
          <div className="text-primary-glow font-display text-2xl font-bold mb-4">
            Rp {product.price.toLocaleString('id-ID')}
          </div>
          {product.description && (
            <div className="mb-5">
              <div className="text-sm font-semibold mb-1.5">Deskripsi</div>
              <p className="text-muted text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}
          <button onClick={onOrder} className="btn-primary w-full">
            <MessageCircle size={16} /> Pesan via Chat
          </button>
        </div>
      </div>

      {/* Zoom penuh layar */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <X size={20} />
          </button>
          <img
            src={images[index]?.image_url}
            alt={product.title}
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

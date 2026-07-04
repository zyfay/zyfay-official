// pages/404.js
import Head from 'next/head';
import Link from 'next/link';
import { Home, SearchX, MessageCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import LiveChat from '../components/LiveChat';

export default function Custom404() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  return (
    <>
      <Head><title>Halaman Tidak Ditemukan | {siteName}</title></Head>
      <div className="min-h-screen bg-bg flex flex-col">
        <Navbar />

        <div className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/15 rounded-full blur-[100px]" />

          <div className="text-center relative z-10 max-w-md">
            <div className="w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <SearchX size={30} className="text-primary-glow" />
            </div>
            <div className="font-display text-6xl font-black text-white/10 mb-2">404</div>
            <h1 className="font-display text-2xl font-bold mb-3">Halaman Tidak Ditemukan</h1>
            <p className="text-muted mb-8">
              Sepertinya kamu nyasar. Halaman yang kamu cari mungkin sudah dipindah, dihapus, atau alamatnya salah ketik.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/" className="btn-primary">
                <Home size={16} /> Kembali ke Beranda
              </Link>
              <Link href="/cek-pesanan" className="btn-secondary">
                Cek Pesanan
              </Link>
            </div>

            <button
              onClick={() => document.querySelector('[data-livechat-trigger]')?.click()}
              className="flex items-center gap-1.5 justify-center mx-auto mt-6 text-muted hover:text-primary-glow text-sm transition-colors"
            >
              <MessageCircle size={14} /> Butuh bantuan? Hubungi kami
            </button>
          </div>
        </div>

        <LiveChat />
      </div>
    </>
  );
}

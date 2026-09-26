// components/Navbar.js
import Link from 'next/link';
import { useState } from 'react';
import { Zap, Menu, X, Package, Home, History, LogIn, Rocket } from 'lucide-react';
import NotificationBell from './NotificationBell';
import MaintenanceWatcher from './MaintenanceWatcher';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const name = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  function handleLoginClick() {
    setOpen(false);
    setShowComingSoon(true);
  }

  return (
    <>
    <MaintenanceWatcher />
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" fill="white" />
          </div>
          <span className="font-display text-xl font-bold text-white">{name}</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted hover:text-white hover:bg-card transition-colors text-sm">
            <Home size={15} /> Beranda
          </Link>
          <Link href="/cek-pesanan" className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted hover:text-white hover:bg-card transition-colors text-sm">
            <Package size={15} /> Cek Pesanan
          </Link>
          <Link href="/riwayat" className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted hover:text-white hover:bg-card transition-colors text-sm">
            <History size={15} /> Riwayat
          </Link>
          <div className="ml-2">
            <NotificationBell />
          </div>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <NotificationBell />
          <button onClick={() => setOpen(!open)} className="text-muted hover:text-white p-2">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-surface border-t border-border px-4 py-3 space-y-1">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-muted hover:text-white hover:bg-card transition-colors">
            <Home size={16} /> Beranda
          </Link>
          <Link href="/cek-pesanan" onClick={() => setOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-muted hover:text-white hover:bg-card transition-colors">
            <Package size={16} /> Cek Pesanan
          </Link>
          <Link href="/riwayat" onClick={() => setOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-muted hover:text-white hover:bg-card transition-colors">
            <History size={16} /> Riwayat
          </Link>
          <button onClick={handleLoginClick} className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-primary-glow hover:bg-card transition-colors">
            <LogIn size={16} /> Masuk
          </button>
        </div>
      )}
    </nav>

    {showComingSoon && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowComingSoon(false)}>
        <div
          className="bg-surface border border-primary/30 rounded-3xl w-full max-w-xs p-6 text-center animate-[popIn_0.25s_ease-out]"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Rocket size={30} className="text-primary-glow" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">Segera Hadir!</h3>
          <p className="text-muted text-sm mb-6">
            Fitur login akun lagi kami siapin biar pengalaman belanja kamu makin enak. Stay tuned ya!
          </p>
          <button
            onClick={() => setShowComingSoon(false)}
            className="btn-primary w-full active:scale-90 transition-transform"
          >
            Oke, Siap!
          </button>
        </div>
      </div>
    )}

    <style jsx global>{`
      @keyframes popIn {
        0% { opacity: 0; transform: scale(0.85) translateY(8px); }
        70% { transform: scale(1.03); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
    `}</style>
    </>
  );
}

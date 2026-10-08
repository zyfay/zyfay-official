// components/Navbar.js
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Zap, Menu, X, Package, Home, History, LogIn, User } from 'lucide-react';
import NotificationBell from './NotificationBell';
import MaintenanceWatcher from './MaintenanceWatcher';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const name = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  // Cek sesi login customer: kalau udah login, tombol berubah dari "Masuk" jadi "Akun"
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => setLoggedIn(!!res.success))
      .catch(() => {});
  }, []);

  // Udah login -> lewat PIN dulu (halaman PIN otomatis lanjut ke saldo). Belum -> halaman welcome.
  const accountHref = loggedIn ? '/akun/pin' : '/akun';

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
          <Link href={accountHref} className="ml-2 btn-primary text-sm px-4 py-2">
            {loggedIn ? <><User size={15} /> Akun</> : <><LogIn size={15} /> Masuk</>}
          </Link>
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
          <Link href={accountHref} onClick={() => setOpen(false)} className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-primary-glow hover:bg-card transition-colors">
            {loggedIn ? <><User size={16} /> Akun Saya</> : <><LogIn size={16} /> Masuk / Daftar</>}
          </Link>
        </div>
      )}
    </nav>

    </>
  );
}

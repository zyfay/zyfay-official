// components/Navbar.js
import Link from 'next/link';
import { useState } from 'react';
import { Zap, Search, Menu, X, Package, Home } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const name = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  return (
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
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-muted hover:text-white p-2">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-surface border-t border-border px-4 py-3 space-y-1">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-muted hover:text-white hover:bg-card transition-colors">
            <Home size={16} /> Beranda
          </Link>
          <Link href="/cek-pesanan" onClick={() => setOpen(false)} className="flex items-center gap-3 py-2.5 px-3 rounded-xl text-muted hover:text-white hover:bg-card transition-colors">
            <Package size={16} /> Cek Pesanan
          </Link>
        </div>
      )}
    </nav>
  );
}

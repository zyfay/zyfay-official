// components/AkunLayout.js
// Kerangka halaman akun (setelah login + PIN): navbar Zyfay, kepala profil, dan menu tab.
// Sekalian jadi "penjaga": belum login -> /akun/masuk, belum buka PIN -> /akun/pin.
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Home, Wallet, History, Settings, Zap, Loader2 } from 'lucide-react';
import Navbar from './Navbar';
import Avatar from './Avatar';

const AkunContext = createContext(null);
export const useAkun = () => useContext(AkunContext);

const TABS = [
  { href: '/akun/saldo',      label: 'Beranda',    icon: Home },
  { href: '/akun/deposit',    label: 'Deposit',    icon: Wallet },
  { href: '/akun/riwayat',    label: 'Riwayat',    icon: History },
  { href: '/akun/pengaturan', label: 'Pengaturan', icon: Settings },
];

export default function AkunLayout({ title, children }) {
  const router = useRouter();
  const [me, setMe] = useState(null);

  async function refresh() {
    const res = await fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.json()).catch(() => null);
    if (!res || !res.success) { router.replace('/akun/masuk'); return null; }
    if (!res.hasPin) { router.replace('/akun/pin/buat'); return null; }
    if (!res.isUnlocked) { router.replace('/akun/pin'); return null; }
    setMe(res);
    return res;
  }

  useEffect(() => { refresh(); }, []);

  if (!me) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-glow animate-pulse">
          <Zap size={26} className="text-white" fill="white" />
        </div>
        <Loader2 size={20} className="animate-spin text-primary-glow" />
      </div>
    );
  }

  return (
    <AkunContext.Provider value={{ ...me, refresh }}>
      <Head><title>{title ? `${title} | Zyfay Official` : 'Akun | Zyfay Official'}</title></Head>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <div className="flex items-center gap-3.5 mb-5 animate-fade-up">
          <Avatar value={me.avatar} size={52} />
          <div className="min-w-0">
            <p className="text-muted text-xs">Selamat datang kembali</p>
            <h1 className="font-display text-xl font-bold truncate">{me.name}</h1>
          </div>
        </div>

        <nav className="card p-1.5 grid grid-cols-4 gap-1 mb-6">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = router.pathname === href;
            return (
              <Link
                key={href} href={href}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-medium transition-all ${
                  active ? 'bg-primary text-white shadow-glow-sm' : 'text-muted hover:text-white hover:bg-card-hover'
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </AkunContext.Provider>
  );
}

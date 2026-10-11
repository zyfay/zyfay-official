// components/AkunLayout.js
// Kerangka halaman akun (setelah login + PIN): navbar Zyfay, kepala profil, dan menu tab.
// Sekalian jadi "penjaga": belum login -> /akun/masuk, belum buka PIN -> /akun/pin.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Home, Wallet, History, Settings, Zap, Loader2 } from 'lucide-react';
import Navbar from './Navbar';
import Avatar from './Avatar';
import toast from 'react-hot-toast';
import { getHistory } from '../lib/orderHistory';

const AkunContext = createContext(null);
export const useAkun = () => useContext(AkunContext);

const TABS = [
  { href: '/akun/saldo',      label: 'Beranda',    icon: Home },
  { href: '/akun/deposit',    label: 'Deposit',    icon: Wallet },
  { href: '/akun/riwayat',    label: 'Riwayat',    icon: History },
  { href: '/akun/pengaturan', label: 'Pengaturan', icon: Settings },
];

const CLAIMED_KEY = 'zyfay_claimed_orders';

// Pesanan tamu di browser ini -> dipindah ke akun. ID yang sudah pernah dicoba dicatat
// supaya tidak dikirim ulang tiap halaman dibuka.
async function claimLocalOrders() {
  try {
    const tried = new Set(JSON.parse(localStorage.getItem(CLAIMED_KEY) || '[]'));
    const ids = getHistory().map((o) => o.id).filter((id) => id && !tried.has(id));
    if (ids.length === 0) return 0;

    const res = await fetch('/api/akun/claim-orders', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    }).then((r) => r.json());
    if (!res.success) return 0;

    ids.forEach((id) => tried.add(id));
    localStorage.setItem(CLAIMED_KEY, JSON.stringify([...tried].slice(-200)));
    return res.claimed || 0;
  } catch {
    return 0;
  }
}

export default function AkunLayout({ title, children }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const claimedOnce = useRef(false);

  async function refresh() {
    const res = await fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.json()).catch(() => null);
    if (!res || !res.success) { router.replace('/akun/masuk'); return null; }
    if (!res.hasPin) { router.replace('/akun/pin/buat'); return null; }
    if (!res.isUnlocked) { router.replace('/akun/pin'); return null; }

    // Sekali per kunjungan: pindahkan pesanan tamu ke akun SEBELUM halaman memuat riwayat
    if (!claimedOnce.current) {
      claimedOnce.current = true;
      const n = await claimLocalOrders();
      if (n > 0) toast.success(`${n} pesanan sebelum login sudah masuk ke riwayat akunmu`);
    }

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

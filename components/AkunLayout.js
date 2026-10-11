// components/AkunLayout.js
// Kerangka halaman akun (setelah login + PIN): navbar Zyfay, kepala profil, dan menu tab.
// Sekalian jadi "penjaga": belum login -> /akun/masuk, belum buka PIN -> /akun/pin.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import Navbar from './Navbar';
import Avatar from './Avatar';
import toast from 'react-hot-toast';
import { getHistory } from '../lib/orderHistory';

const AkunContext = createContext(null);
export const useAkun = () => useContext(AkunContext);

const TABS = [
  { href: '/akun/saldo',      label: 'Beranda' },
  { href: '/akun/deposit',    label: 'Deposit' },
  { href: '/akun/riwayat',    label: 'Riwayat' },
  { href: '/akun/pengaturan', label: 'Pengaturan' },
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-primary-glow" />
      </div>
    );
  }

  return (
    <AkunContext.Provider value={{ ...me, refresh }}>
      <Head><title>{title ? `${title} | Zyfay Official` : 'Akun | Zyfay Official'}</title></Head>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-5 pb-16">
        <div className="flex items-center gap-2.5 mb-4">
          <Avatar value={me.avatar} size={32} />
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-medium truncate">{me.name}</div>
            <div className="text-xs text-muted truncate">{me.email}</div>
          </div>
        </div>

        <nav className="flex gap-5 border-b border-border mb-5 overflow-x-auto">
          {TABS.map(({ href, label }) => {
            const active = router.pathname === href;
            return (
              <Link
                key={href} href={href}
                className={`pb-2.5 -mb-px text-[13px] whitespace-nowrap border-b-2 transition-colors ${
                  active ? 'border-primary text-white font-medium' : 'border-transparent text-muted hover:text-white'
                }`}
              >
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

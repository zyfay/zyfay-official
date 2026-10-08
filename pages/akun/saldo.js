// pages/akun/saldo.js — Beranda akun (route tetap /akun/saldo)
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Wallet, History, Gift, ChevronRight, Loader2 } from 'lucide-react';
import AkunLayout, { useAkun } from '../../components/AkunLayout';
import HistoryItem from '../../components/HistoryItem';
import { rupiah, REFERRAL_BONUS } from '../../lib/akunConfig';

function Content() {
  const me = useAkun();
  const [hidden, setHidden] = useState(false);
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch('/api/akun/history?limit=5', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => setItems(res.success ? res.items : []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="space-y-5">
      {/* Kartu saldo */}
      <div className="card relative overflow-hidden p-5">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-muted text-sm">Saldo Zyfay</span>
            <button onClick={() => setHidden(!hidden)} className="text-muted hover:text-white transition-colors p-1" aria-label="Tampilkan/sembunyikan saldo">
              {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="font-display text-3xl font-bold mb-5">
            {hidden ? 'Rp ••••••' : rupiah(me.balance)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/akun/deposit" className="btn-primary text-sm py-2.5"><Wallet size={16} /> Deposit</Link>
            <Link href="/akun/riwayat" className="btn-secondary text-sm py-2.5"><History size={16} /> Riwayat</Link>
          </div>
        </div>
      </div>

      {/* Ajakan referral */}
      <Link href="/akun/pengaturan?open=referral" className="card-hover p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Gift size={18} className="text-primary-glow" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Ajak teman, dapat {rupiah(REFERRAL_BONUS)}</div>
          <div className="text-muted text-xs">Temanmu juga dapat bonus yang sama</div>
        </div>
        <ChevronRight size={16} className="text-muted" />
      </Link>

      {/* Aktivitas terakhir */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold">Aktivitas Terakhir</h2>
          <Link href="/akun/riwayat" className="text-primary-glow text-xs hover:underline">Lihat semua</Link>
        </div>
        {items === null ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">Belum ada aktivitas. Pesanan yang kamu buat saat login akan muncul di sini.</p>
        ) : (
          items.map((it) => <HistoryItem key={`${it.type}-${it.id}`} item={it} />)
        )}
      </div>
    </div>
  );
}

export default function SaldoPage() {
  return <AkunLayout title="Beranda"><Content /></AkunLayout>;
}

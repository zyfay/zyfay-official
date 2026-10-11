// pages/akun/saldo.js — Beranda akun (route tetap /akun/saldo)
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AkunLayout, { useAkun } from '../../components/AkunLayout';
import HistoryItem from '../../components/HistoryItem';
import { btnClass, panelClass, Label } from '../../components/akunUi';
import { rupiah } from '../../lib/akunConfig';

function Content() {
  const me = useAkun();
  const [hidden, setHidden] = useState(false);
  const [items, setItems] = useState(null);

  useEffect(() => {
    fetch('/api/akun/history?limit=6', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => setItems(res.success ? res.items : []))
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className={`${panelClass} p-4`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Saldo</span>
          <button onClick={() => setHidden(!hidden)} className="text-muted hover:text-white transition-colors" aria-label="Tampilkan atau sembunyikan saldo">
            {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <div className="text-2xl font-semibold tracking-tight mt-1 mb-3.5">
          {hidden ? 'Rp ••••••' : rupiah(me.balance)}
        </div>
        <div className="flex gap-2">
          <Link href="/akun/deposit" className={btnClass('primary', 'sm')}>Deposit</Link>
          <Link href="/akun/riwayat" className={btnClass('secondary', 'sm')}>Riwayat</Link>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label>Aktivitas terakhir</Label>
          <Link href="/akun/riwayat" className="text-xs text-primary-glow hover:underline">Semua</Link>
        </div>
        {items === null ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-muted text-sm py-6">Belum ada aktivitas.</p>
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

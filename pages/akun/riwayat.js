// pages/akun/riwayat.js — semua transaksi, deposit, dan perubahan saldo
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import AkunLayout from '../../components/AkunLayout';
import HistoryItem from '../../components/HistoryItem';

const FILTERS = [
  { id: 'all',     label: 'Semua' },
  { id: 'order',   label: 'Pesanan' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'saldo',   label: 'Saldo' },
];

function Content() {
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/akun/history?limit=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => setItems(res.success ? res.items : []))
      .catch(() => setItems([]));
  }, []);

  const shown = (items || []).filter((i) => filter === 'all' || i.type === filter);

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap border transition-all ${
              filter === f.id ? 'bg-primary border-primary text-white shadow-glow-sm' : 'bg-card border-border text-muted hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card p-5">
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-primary" /></div>
        ) : shown.length === 0 ? (
          <p className="text-muted text-sm text-center py-10">Belum ada riwayat di kategori ini.</p>
        ) : (
          shown.map((it) => <HistoryItem key={`${it.type}-${it.id}`} item={it} />)
        )}
      </div>

      <p className="text-muted text-xs text-center mt-4">
        Pesanan yang dibuat tanpa login (tamu) tidak masuk sini, tapi tetap bisa dicek lewat menu Cek Pesanan.
      </p>
    </div>
  );
}

export default function RiwayatPage() {
  return <AkunLayout title="Riwayat"><Content /></AkunLayout>;
}

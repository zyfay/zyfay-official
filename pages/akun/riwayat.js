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
      <div className="flex gap-4 mb-2 text-[13px]">
        {FILTERS.map((f) => (
          <button
            key={f.id} onClick={() => setFilter(f.id)}
            className={`transition-colors ${filter === f.id ? 'text-primary-glow font-medium' : 'text-muted hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="flex justify-center py-10"><Loader2 size={18} className="animate-spin text-primary" /></div>
      ) : shown.length === 0 ? (
        <p className="text-muted text-sm py-8">Belum ada riwayat di kategori ini.</p>
      ) : (
        shown.map((it) => <HistoryItem key={`${it.type}-${it.id}`} item={it} />)
      )}

      <p className="text-muted text-[11px] mt-5">
        Pesanan yang kamu buat sebelum login di perangkat ini (24 jam terakhir) otomatis ikut masuk saat kamu login.
      </p>
    </div>
  );
}

export default function RiwayatPage() {
  return <AkunLayout title="Riwayat"><Content /></AkunLayout>;
}

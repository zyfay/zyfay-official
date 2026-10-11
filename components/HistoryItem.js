// components/HistoryItem.js — satu baris riwayat (pesanan / deposit / saldo), datar tanpa ikon & pil
import { rupiah } from '../lib/akunConfig';
import { STATUS } from './akunUi';

export default function HistoryItem({ item }) {
  const status = STATUS[item.status] || { label: item.status, color: 'text-muted' };

  // Pesanan dibayar lewat QRIS/VA/saldo jadi tanpa tanda +/-; deposit & saldo pakai tanda.
  const amount = Number(item.amount) || 0;
  const showSign = item.type !== 'order';
  const amountText = showSign ? `${amount >= 0 ? '+' : '−'}${rupiah(Math.abs(amount))}` : rupiah(amount);
  const amountColor = !showSign ? 'text-white' : amount >= 0 ? 'text-emerald-400' : 'text-red-400';

  const date = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <div className="text-sm truncate">{item.title}</div>
        <div className="text-xs text-muted truncate">{[item.subtitle, date].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-sm ${amountColor}`}>{amountText}</div>
        {item.type !== 'saldo' && <div className={`text-[11px] ${status.color}`}>{status.label}</div>}
      </div>
    </div>
  );
}

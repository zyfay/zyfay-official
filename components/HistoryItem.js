// components/HistoryItem.js — satu baris riwayat (pesanan / deposit / saldo)
import { ShoppingBag, ArrowDownLeft, Gift } from 'lucide-react';
import { rupiah } from '../lib/akunConfig';

const STATUS = {
  pending:    { label: 'Menunggu',  cls: 'badge-warning' },
  processing: { label: 'Diproses',  cls: 'badge-info' },
  success:    { label: 'Berhasil',  cls: 'badge-success' },
  failed:     { label: 'Gagal',     cls: 'badge-danger' },
  cancelled:  { label: 'Dibatalkan', cls: 'badge-danger' },
};

const TYPE = {
  order:   { icon: ShoppingBag,   tile: 'bg-primary/15 text-primary-glow' },
  deposit: { icon: ArrowDownLeft, tile: 'bg-emerald-500/15 text-emerald-400' },
  saldo:   { icon: Gift,          tile: 'bg-sky-500/15 text-sky-400' },
};

export default function HistoryItem({ item }) {
  const t = TYPE[item.type] || TYPE.order;
  const Icon = t.icon;
  const status = STATUS[item.status] || { label: item.status, cls: 'badge-purple' };

  // Pesanan dibayar lewat QRIS/VA (bukan saldo) jadi tanpa tanda +/-; deposit & saldo pakai tanda.
  const amount = Number(item.amount) || 0;
  const showSign = item.type !== 'order';
  const amountText = showSign ? `${amount >= 0 ? '+' : '−'}${rupiah(Math.abs(amount))}` : rupiah(amount);
  const amountColor = !showSign ? 'text-white' : amount >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/60 last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.tile}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{item.title}</div>
        <div className="text-muted text-xs truncate">
          {[item.subtitle, new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })]
            .filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-semibold ${amountColor}`}>{amountText}</div>
        {item.type !== 'saldo' && <span className={`${status.cls} !text-[10px] !px-2 !py-0.5 inline-block mt-0.5`}>{status.label}</span>}
      </div>
    </div>
  );
}

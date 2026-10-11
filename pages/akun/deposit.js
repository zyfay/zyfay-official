// pages/akun/deposit.js — deposit saldo via Pakasir (QRIS / Virtual Account), saldo masuk otomatis
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Copy, X } from 'lucide-react';
import AkunLayout, { useAkun } from '../../components/AkunLayout';
import { Btn, inputClass, panelClass, Label, STATUS } from '../../components/akunUi';
import { rupiah } from '../../lib/akunConfig';

const QUICK = [100000, 200000, 500000, 1000000];
const POLL_MS = 5000;

const short = (n) => (n >= 1000000 ? `${n / 1000000}jt` : `${n / 1000}rb`);

function copy(text) {
  navigator.clipboard.writeText(String(text));
  toast.success('Disalin');
}

async function post(body) {
  return fetch('/api/akun/deposit', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

// Tiket yang lagi dibayar. Selama tampil & masih pending, statusnya dicek ke Pakasir tiap 5 detik.
function TicketDetail({ dep, onClose, onCancel, cancelling, onPaid }) {
  const isQris = dep.method_id === 'qris';
  const expired = dep.expired_at && new Date(dep.expired_at).getTime() < Date.now();
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    if (dep.status !== 'pending') return;
    const t = setInterval(async () => {
      if (stopped.current) return;
      try {
        const res = await post({ action: 'check', id: dep.id });
        if (res.success && res.status && res.status !== 'pending') {
          stopped.current = true;
          onPaid(res.status);
        }
      } catch { /* dicoba lagi di putaran berikut */ }
    }, POLL_MS);
    return () => { stopped.current = true; clearInterval(t); };
  }, [dep.id, dep.status]);

  return (
    <div className={`${panelClass} border-primary/40 p-4 mb-6`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-medium">Bayar deposit</div>
          <div className="text-xs text-muted">{dep.method_name} · {dep.id}</div>
        </div>
        <button onClick={onClose} className="text-muted hover:text-white" aria-label="Tutup"><X size={16} /></button>
      </div>

      {isQris ? (
        <div className="flex justify-center mb-3">
          <div className="bg-white p-2 rounded-lg">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(dep.pay || '')}`}
              alt="QRIS" className="w-40 h-40 object-contain"
            />
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg px-3 py-2.5 mb-3">
          <div className="text-[11px] text-muted mb-0.5">Virtual Account{dep.pay_name ? ` · ${dep.pay_name}` : ''}</div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-base break-all">{dep.pay}</span>
            <button onClick={() => copy(dep.pay)} className="text-primary-glow flex-shrink-0" aria-label="Salin"><Copy size={14} /></button>
          </div>
        </div>
      )}

      <div className="text-[13px] space-y-1.5 mb-3">
        <div className="flex justify-between"><span className="text-muted">Saldo masuk</span><span>{rupiah(dep.nominal)}</span></div>
        {dep.biaya_admin > 0 && (
          <div className="flex justify-between"><span className="text-muted">Biaya admin</span><span>{rupiah(dep.biaya_admin)}</span></div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-muted">Total bayar</span>
          <span className="font-semibold text-primary-glow flex items-center gap-1.5">
            {rupiah(dep.total_transfer)}
            <button onClick={() => copy(dep.total_transfer)} className="text-muted hover:text-white" aria-label="Salin"><Copy size={12} /></button>
          </span>
        </div>
        {dep.expired_at && (
          <div className="flex justify-between">
            <span className="text-muted">Batas bayar</span>
            <span className={expired ? 'text-red-400' : ''}>
              {new Date(dep.expired_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
        )}
      </div>

      {dep.status === 'pending' && (
        <>
          <p className="text-[11px] text-muted leading-relaxed flex items-start gap-1.5 mb-3">
            <Loader2 size={12} className="animate-spin text-primary-glow flex-shrink-0 mt-0.5" />
            <span>Menunggu pembayaran, bayar tepat sesuai total. Saldo masuk otomatis. Kalau sudah bayar tapi belum masuk, hubungi CS dengan ID {dep.id}.</span>
          </p>
          <Btn variant="danger" size="sm" onClick={onCancel} loading={cancelling} className="w-full">Batalkan tiket</Btn>
        </>
      )}
    </div>
  );
}

function Content() {
  const akun = useAkun();
  const [info, setInfo] = useState(null);
  const [nominal, setNominal] = useState('');
  const [method, setMethod] = useState('qris');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [active, setActive] = useState(null);

  async function load() {
    const res = await fetch('/api/akun/deposit', { credentials: 'include' }).then((r) => r.json()).catch(() => null);
    if (res?.success) {
      setInfo(res);
    } else {
      toast.error(res?.message || 'Gagal memuat deposit');
      setInfo({ methods: [], deposits: [], min: 100000, max: 5000000 });
    }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    const value = parseInt(nominal, 10);
    if (!value || value < info.min) { toast.error(`Minimal deposit ${rupiah(info.min)}`); return; }
    if (value > info.max) { toast.error(`Maksimal deposit ${rupiah(info.max)}`); return; }
    setCreating(true);
    try {
      const res = await post({ nominal: value, method });
      if (!res.success) throw new Error(res.message);
      setActive(res.deposit);
      setNominal('');
      load();
    } catch (err) {
      toast.error(err.message || 'Gagal membuat deposit');
    } finally {
      setCreating(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await post({ action: 'cancel', id: active.id });
      if (!res.success) throw new Error(res.message);
      toast.success('Tiket dibatalkan');
      setActive(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Gagal membatalkan');
      load();
    } finally {
      setCancelling(false);
    }
  }

  async function handlePaid(status) {
    if (status === 'success') {
      toast.success('Deposit berhasil, saldo sudah bertambah');
      await akun.refresh();
    } else {
      toast.error('Tiket deposit ini sudah dibatalkan atau kedaluwarsa');
    }
    setActive(null);
    load();
  }

  if (!info) return <div className="flex justify-center py-16"><Loader2 size={18} className="animate-spin text-primary" /></div>;

  const qris = info.methods.filter((m) => m.type === 'qris');
  const vas = info.methods.filter((m) => m.type === 'va');
  const chip = (on) => `h-9 rounded-lg border text-[13px] transition-colors ${on ? 'border-primary bg-primary/15 text-white' : 'border-border bg-card text-muted hover:text-white'}`;

  return (
    <div>
      {active && (
        <TicketDetail dep={active} onClose={() => setActive(null)} onCancel={handleCancel} cancelling={cancelling} onPaid={handlePaid} />
      )}

      <Label className="mb-2">Isi saldo</Label>
      {info.methods.length === 0 ? (
        <p className="text-sm text-amber-400 mb-6">Deposit belum tersedia saat ini. Hubungi CS.</p>
      ) : (
        <form onSubmit={handleCreate} className="space-y-4 mb-8">
          <div>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {QUICK.map((q) => (
                <button type="button" key={q} onClick={() => setNominal(String(q))} className={chip(String(q) === nominal)}>
                  {short(q)}
                </button>
              ))}
            </div>
            <input
              type="text" inputMode="numeric" value={nominal}
              onChange={(e) => setNominal(e.target.value.replace(/\D/g, ''))}
              placeholder={`Nominal lain (min. ${rupiah(info.min)})`} className={inputClass} disabled={creating}
            />
            {nominal && <p className="text-xs text-muted mt-1.5">{rupiah(nominal)}</p>}
          </div>

          <div>
            <div className="text-xs text-muted mb-1.5">Metode</div>
            {qris.map((m) => (
              <button type="button" key={m.id} onClick={() => setMethod(m.id)} className={`${chip(method === m.id)} w-full mb-1.5`}>
                {m.name}
              </button>
            ))}
            {vas.length > 0 && (
              <div className="grid grid-cols-2 gap-1.5">
                {vas.map((m) => (
                  <button type="button" key={m.id} onClick={() => setMethod(m.id)} className={`${chip(method === m.id)} truncate px-2`}>
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Btn type="submit" loading={creating} className="w-full">Lanjut ke pembayaran</Btn>
        </form>
      )}

      <Label className="mb-1">Riwayat deposit</Label>
      {info.deposits.length === 0 ? (
        <p className="text-muted text-sm py-6">Belum ada deposit.</p>
      ) : (
        info.deposits.map((d) => {
          const st = STATUS[d.status] || { label: d.status, color: 'text-muted' };
          const clickable = d.status === 'pending';
          return (
            <button
              key={d.id} disabled={!clickable} onClick={() => setActive(d)}
              className="w-full flex items-center justify-between gap-3 py-2.5 border-b border-border/50 last:border-0 text-left"
            >
              <div className="min-w-0">
                <div className="text-sm">{rupiah(d.nominal)}</div>
                <div className="text-xs text-muted truncate">{d.method_name} · {new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
              </div>
              <span className={`text-[11px] flex-shrink-0 ${st.color}`}>{st.label}{clickable ? ' ›' : ''}</span>
            </button>
          );
        })
      )}
    </div>
  );
}

export default function DepositPage() {
  return <AkunLayout title="Deposit"><Content /></AkunLayout>;
}

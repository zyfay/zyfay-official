// pages/akun/deposit.js — deposit saldo (tiket TokoVoucher, dikonfirmasi admin)
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Copy, QrCode, Landmark, Clock, X, Info } from 'lucide-react';
import AkunLayout from '../../components/AkunLayout';
import { rupiah } from '../../lib/akunConfig';

const QUICK = [100000, 200000, 500000, 1000000];
const STATUS = {
  pending:   { label: 'Menunggu pembayaran', cls: 'badge-warning' },
  success:   { label: 'Berhasil',            cls: 'badge-success' },
  cancelled: { label: 'Dibatalkan',          cls: 'badge-danger' },
};

function copy(text) {
  navigator.clipboard.writeText(String(text));
  toast.success('Disalin');
}

function TicketDetail({ dep, onClose, onCancel, cancelling }) {
  const isImage = /^https?:\/\//.test(dep.pay || '');
  return (
    <div className="card p-5 mb-5 border-primary/40 shadow-glow-sm animate-fade-up">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="font-display font-bold">Bayar Deposit</div>
          <div className="text-muted text-xs">{dep.method_name} · {dep.id}</div>
        </div>
        <button onClick={onClose} className="text-muted hover:text-white"><X size={18} /></button>
      </div>

      {isImage ? (
        <div className="flex flex-col items-center mb-4">
          <div className="bg-white p-3 rounded-2xl">
            <img src={dep.pay} alt="QRIS" className="w-52 h-52 object-contain" />
          </div>
          <p className="text-muted text-xs mt-2 flex items-center gap-1"><QrCode size={12} /> Scan pakai e-wallet / m-banking</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <div className="text-muted text-xs mb-1 flex items-center gap-1"><Landmark size={12} /> Nomor tujuan{dep.pay_name ? ` · a.n. ${dep.pay_name}` : ''}</div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-lg tracking-wide break-all">{dep.pay}</span>
            <button onClick={() => copy(dep.pay)} className="text-primary-glow flex-shrink-0"><Copy size={16} /></button>
          </div>
        </div>
      )}

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between"><span className="text-muted">Saldo yang masuk</span><span className="font-semibold">{rupiah(dep.nominal)}</span></div>
        {dep.kode_unik > 0 && (
          <div className="flex justify-between"><span className="text-muted">Kode unik</span><span>{dep.kode_unik}</span></div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-muted">Total yang dibayar</span>
          <span className="font-display font-bold text-primary-glow flex items-center gap-2">
            {rupiah(dep.total_transfer)}
            <button onClick={() => copy(dep.total_transfer)} className="text-muted hover:text-white"><Copy size={13} /></button>
          </span>
        </div>
        {dep.expired_at && (
          <div className="flex justify-between"><span className="text-muted flex items-center gap-1"><Clock size={12} /> Batas bayar</span><span>{dep.expired_at}</span></div>
        )}
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-muted leading-relaxed flex gap-2 mb-4">
        <Info size={14} className="text-primary-glow flex-shrink-0 mt-0.5" />
        <span>Bayar <b className="text-white">tepat sesuai total</b> di atas. Saldo masuk setelah pembayaran dikonfirmasi admin, biasanya beberapa menit. Kalau sudah bayar tapi saldo belum masuk, hubungi CS dengan menyebut ID <b className="text-white">{dep.id}</b>.</span>
      </div>

      {dep.status === 'pending' && (
        <button onClick={onCancel} disabled={cancelling} className="btn-secondary w-full text-sm text-red-400">
          {cancelling ? <Loader2 size={14} className="animate-spin" /> : 'Batalkan tiket ini'}
        </button>
      )}
    </div>
  );
}

function Content() {
  const [info, setInfo] = useState(null);
  const [nominal, setNominal] = useState('');
  const [method, setMethod] = useState('');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [active, setActive] = useState(null);

  async function load() {
    const res = await fetch('/api/akun/deposit', { credentials: 'include' }).then((r) => r.json()).catch(() => null);
    if (res?.success) {
      setInfo(res);
      setMethod((m) => m || res.methods?.[0]?.id || '');
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
      const res = await fetch('/api/akun/deposit', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nominal: value, method }),
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.message);
      toast.success('Tiket deposit dibuat');
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
      const res = await fetch('/api/akun/deposit', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id: active.id }),
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.message);
      toast.success('Tiket dibatalkan');
      setActive(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Gagal membatalkan');
    } finally {
      setCancelling(false);
    }
  }

  if (!info) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div>
      {active && <TicketDetail dep={active} onClose={() => setActive(null)} onCancel={handleCancel} cancelling={cancelling} />}

      <div className="card p-5 mb-5">
        <h2 className="font-display font-bold mb-1">Isi Saldo</h2>
        <p className="text-muted text-xs mb-4">Minimal {rupiah(info.min)}</p>

        {info.methods.length === 0 ? (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-xl p-4">
            Metode deposit belum tersedia. Silakan hubungi CS.
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {QUICK.map((q) => (
                <button
                  type="button" key={q} onClick={() => setNominal(String(q))}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    String(q) === nominal ? 'bg-primary/20 border-primary text-white' : 'bg-surface border-border text-muted hover:text-white'
                  }`}
                >
                  {rupiah(q)}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">Atau isi nominal sendiri</label>
              <input
                type="text" inputMode="numeric" value={nominal}
                onChange={(e) => setNominal(e.target.value.replace(/\D/g, ''))}
                placeholder="Contoh: 150000" className="input-field" disabled={creating}
              />
              {nominal && <p className="text-primary-glow text-xs mt-1.5">{rupiah(nominal)}</p>}
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">Metode pembayaran</label>
              <div className="space-y-2">
                {info.methods.map((m) => (
                  <button
                    type="button" key={m.id} onClick={() => setMethod(m.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                      method === m.id ? 'bg-primary/15 border-primary' : 'bg-surface border-border hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${method === m.id ? 'border-primary bg-primary' : 'border-border'}`} />
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      {m.desc && <div className="text-muted text-xs">{m.desc}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={creating} className="btn-primary w-full">
              {creating ? <Loader2 size={18} className="animate-spin" /> : 'Buat Tiket Deposit'}
            </button>
          </form>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display font-bold mb-1">Riwayat Deposit</h2>
        {info.deposits.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">Belum ada deposit.</p>
        ) : (
          info.deposits.map((d) => {
            const st = STATUS[d.status] || { label: d.status, cls: 'badge-purple' };
            const clickable = d.status === 'pending';
            return (
              <button
                key={d.id} disabled={!clickable} onClick={() => setActive(d)}
                className={`w-full flex items-center justify-between gap-3 py-3 border-b border-border/60 last:border-0 text-left ${clickable ? 'hover:bg-card-hover -mx-2 px-2 rounded-lg' : ''}`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">{rupiah(d.nominal)}</div>
                  <div className="text-muted text-xs truncate">{d.method_name} · {new Date(d.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                </div>
                <span className={`${st.cls} !text-[10px] flex-shrink-0`}>{st.label}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function DepositPage() {
  return <AkunLayout title="Deposit"><Content /></AkunLayout>;
}

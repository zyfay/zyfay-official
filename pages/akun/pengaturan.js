// pages/akun/pengaturan.js — pengaturan akun
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { ChevronRight, ChevronDown, X, Check, Copy } from 'lucide-react';
import AkunLayout, { useAkun } from '../../components/AkunLayout';
import Avatar, { AVATAR_ICONS, AVATAR_COLORS } from '../../components/Avatar';
import ConfirmModal from '../../components/ConfirmModal';
import { Btn, inputClass, panelClass } from '../../components/akunUi';
import { AVATAR_ICON_KEYS, AVATAR_COLOR_KEYS, rupiah } from '../../lib/akunConfig';

function copy(text, msg = 'Disalin') {
  navigator.clipboard.writeText(String(text));
  toast.success(msg);
}

async function api(url, method, body) {
  const res = await fetch(url, {
    method, credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());
  if (!res.success) throw new Error(res.message || 'Terjadi kesalahan');
  return res;
}

// ---- Kerangka modal kecil ----
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-medium">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-white" aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}

function AvatarModal({ current, onClose, onSaved }) {
  const [icon, setIcon] = useState((current || 'zap:purple').split(':')[0]);
  const [color, setColor] = useState((current || 'zap:purple').split(':')[1] || 'purple');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api('/api/akun/profile', 'PATCH', { avatar: `${icon}:${color}` });
      toast.success('Profil diperbarui');
      await onSaved();
      onClose();
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  }

  return (
    <Modal title="Ubah profil" onClose={onClose}>
      <div className="flex justify-center my-3"><Avatar value={`${icon}:${color}`} size={56} /></div>

      <div className="grid grid-cols-6 gap-1.5 mb-3">
        {AVATAR_ICON_KEYS.map((k) => {
          const Icon = AVATAR_ICONS[k];
          return (
            <button key={k} onClick={() => setIcon(k)} aria-label={k}
              className={`h-9 rounded-lg flex items-center justify-center border transition-colors ${
                icon === k ? 'bg-primary/20 border-primary text-white' : 'bg-card border-border text-muted hover:text-white'
              }`}>
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 mb-4">
        {AVATAR_COLOR_KEYS.map((k) => (
          <button key={k} onClick={() => setColor(k)} aria-label={k}
            className={`w-6 h-6 rounded-full bg-gradient-to-br ${AVATAR_COLORS[k]} flex items-center justify-center ${
              color === k ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''
            }`}>
            {color === k && <Check size={11} className="text-white" />}
          </button>
        ))}
      </div>

      <Btn onClick={save} loading={saving} className="w-full">Simpan</Btn>
    </Modal>
  );
}

function NameModal({ current, onClose, onSaved }) {
  const [name, setName] = useState(current);
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/api/akun/profile', 'PATCH', { name });
      toast.success('Nama diperbarui');
      await onSaved();
      onClose();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  }

  return (
    <Modal title="Ubah nama" onClose={onClose}>
      <form onSubmit={save} className="space-y-2.5">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className={inputClass} placeholder="Nama baru" disabled={saving} autoFocus />
        <p className="text-[11px] text-muted">3-30 karakter. Nama juga dipakai buat login, jadi tidak boleh sama dengan akun lain.</p>
        <Btn type="submit" loading={saving} className="w-full">Simpan</Btn>
      </form>
    </Modal>
  );
}

function EmailModal({ current, onClose, onSaved }) {
  const [step, setStep] = useState('input'); // 'input' | 'otp'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [masked, setMasked] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestOtp(e) {
    e?.preventDefault();
    setBusy(true);
    try {
      const res = await api('/api/akun/email', 'POST', { action: 'request', newEmail: email });
      setMasked(res.maskedPhone || '');
      setStep('otp');
      toast.success('Kode OTP dikirim ke WhatsApp kamu');
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/api/akun/email', 'POST', { action: 'verify', code });
      toast.success('Email berhasil diganti');
      await onSaved();
      onClose();
    } catch (err) { toast.error(err.message); }
    setBusy(false);
  }

  return (
    <Modal title="Ubah email" onClose={onClose}>
      {step === 'input' ? (
        <form onSubmit={requestOtp} className="space-y-2.5">
          <p className="text-xs text-muted">Sekarang: <span className="text-white">{current}</span></p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="Email baru" disabled={busy} autoFocus />
          <p className="text-[11px] text-muted">Kode OTP dikirim ke WhatsApp yang terdaftar di akun ini.</p>
          <Btn type="submit" loading={busy} className="w-full">Kirim kode OTP</Btn>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-2.5">
          <p className="text-xs text-muted">Masukkan 6 digit kode yang dikirim ke WhatsApp {masked}.</p>
          <input
            inputMode="numeric" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className={`${inputClass} text-center tracking-[0.4em]`} placeholder="••••••" disabled={busy} autoFocus
          />
          <Btn type="submit" loading={busy} disabled={code.length !== 6} className="w-full">Verifikasi</Btn>
          <button type="button" onClick={requestOtp} disabled={busy} className="text-primary-glow text-xs w-full hover:underline">Kirim ulang kode</button>
        </form>
      )}
    </Modal>
  );
}

// ---- Panel API Zyfay ----
function ApiPanel() {
  const [info, setInfo] = useState(null);
  const [newKey, setNewKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const base = typeof window !== 'undefined' ? window.location.origin : '';

  async function load() {
    try { setInfo(await api('/api/akun/api-key', 'GET')); }
    catch (e) { setInfo({ hasKey: false, error: e.message }); }
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setBusy(true);
    try {
      const res = await api('/api/akun/api-key', 'POST');
      setNewKey(res.key);
      setConfirmOpen(false);
      toast.success('API key dibuat');
      load();
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  }

  if (!info) return <p className="text-xs text-muted py-2">Memuat...</p>;

  return (
    <div className="space-y-3 text-xs">
      <p className="text-muted">Kirim key lewat header <code className="text-primary-glow">x-api-key</code>.</p>

      <div className="flex items-center justify-between gap-2 bg-surface border border-border rounded-lg px-3 py-2">
        <span className="font-mono text-[11px] truncate">{base}/api/app</span>
        <button onClick={() => copy(`${base}/api/app`)} className="text-primary-glow flex-shrink-0" aria-label="Salin"><Copy size={13} /></button>
      </div>

      {newKey && (
        <div className="border border-emerald-500/30 bg-emerald-500/10 rounded-lg p-2.5">
          <div className="text-emerald-400 mb-1">Key baru, simpan sekarang. Tidak ditampilkan lagi.</div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] break-all">{newKey}</span>
            <button onClick={() => copy(newKey, 'API key disalin')} className="text-emerald-400 flex-shrink-0" aria-label="Salin"><Copy size={13} /></button>
          </div>
        </div>
      )}

      {info.hasKey && !newKey && (
        <div>
          <div className="bg-surface border border-border rounded-lg px-3 py-2 font-mono text-[11px]">{info.masked}</div>
          <div className="text-[11px] text-muted mt-1">
            Dibuat {new Date(info.created_at).toLocaleDateString('id-ID')}
            {info.last_used_at ? ` · terakhir dipakai ${new Date(info.last_used_at).toLocaleDateString('id-ID')}` : ' · belum pernah dipakai'}
          </div>
        </div>
      )}

      {info.error && <p className="text-red-400">{info.error}</p>}

      <Btn variant="secondary" size="sm" loading={busy} onClick={() => (info.hasKey ? setConfirmOpen(true) : generate())}>
        {info.hasKey ? 'Buat ulang key' : 'Buat API key'}
      </Btn>

      <div className="font-mono text-[11px] text-muted leading-relaxed">
        <div>GET  /games</div>
        <div>GET  /products?game_id=…</div>
        <div>GET  /flash-sales</div>
        <div>POST /orders/create</div>
        <div>GET  /orders/check?id=…</div>
        <div>POST /cekid-game</div>
      </div>

      <ConfirmModal
        open={confirmOpen} title="Buat ulang API key?"
        message="Key yang lama langsung tidak berlaku. Semua aplikasi yang masih memakainya akan berhenti bisa mengakses."
        confirmLabel="Ya, buat ulang" danger loading={busy}
        onConfirm={generate} onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

// ---- Panel Referral ----
function ReferralPanel() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/api/akun/referral', 'GET').then(setData).catch((e) => {
      toast.error(e.message);
      setData({ code: null, invited: 0, totalBonus: 0, bonusPerInvite: 0 });
    });
  }, []);

  if (!data) return <p className="text-xs text-muted py-2">Memuat...</p>;

  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/akun/daftar?ref=${data.code}`;

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Zyfay Official', text: `Daftar di Zyfay pakai kode referralku ${data.code} dan dapat bonus saldo!`, url: link }); return; }
      catch { /* dibatalkan user */ }
    }
    copy(link, 'Link referral disalin');
  }

  return (
    <div className="space-y-3 text-xs">
      <p className="text-muted">
        Tiap teman yang daftar pakai kodemu, kamu dan temanmu sama-sama dapat <span className="text-white">{rupiah(data.bonusPerInvite)}</span>.
      </p>

      <div className="flex items-center justify-between bg-surface border border-border rounded-lg px-3 py-2.5">
        <span className="font-mono text-base tracking-widest text-primary-glow">{data.code}</span>
        <span className="text-muted">{data.invited} teman · {rupiah(data.totalBonus)}</span>
      </div>

      <div className="flex gap-2">
        <Btn variant="secondary" size="sm" onClick={() => copy(data.code, 'Kode disalin')}>Salin kode</Btn>
        <Btn variant="secondary" size="sm" onClick={share}>Bagikan link</Btn>
      </div>
    </div>
  );
}

// ---- Baris daftar ----
function Row({ label, value, onClick, danger = false }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-card-hover transition-colors text-left">
      <span className={`text-sm ${danger ? 'text-red-400' : ''}`}>{label}</span>
      <span className="flex items-center gap-1.5 min-w-0">
        {value && <span className="text-xs text-muted truncate">{value}</span>}
        {!danger && <ChevronRight size={14} className="text-muted flex-shrink-0" />}
      </span>
    </button>
  );
}

function Section({ title, open, onToggle, children }) {
  return (
    <div>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-card-hover transition-colors text-left">
        <span className="text-sm">{title}</span>
        <ChevronDown size={14} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function Content() {
  const me = useAkun();
  const router = useRouter();
  const [modal, setModal] = useState(null); // 'avatar' | 'name' | 'email' | 'logout'
  const [open, setOpen] = useState(null);   // 'api' | 'referral'
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (router.query.open === 'api' || router.query.open === 'referral') setOpen(router.query.open);
  }, [router.query.open]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      toast.success('Kamu sudah keluar');
      router.push('/');
    } catch {
      toast.error('Gagal keluar, coba lagi');
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Avatar value={me.avatar} size={44} />
        <div className="min-w-0 flex-1 leading-snug">
          <div className="text-sm font-medium truncate">{me.name}</div>
          <div className="text-xs text-muted truncate">{me.phone}</div>
        </div>
        <Btn variant="secondary" size="sm" onClick={() => setModal('avatar')}>Ubah profil</Btn>
      </div>

      <div className={`${panelClass} divide-y divide-border/60 overflow-hidden`}>
        <Row label="Nama" value={me.name} onClick={() => setModal('name')} />
        <Row label="Email" value={me.email} onClick={() => setModal('email')} />
      </div>

      <div className={`${panelClass} divide-y divide-border/60 overflow-hidden`}>
        <Section title="API Zyfay" open={open === 'api'} onToggle={() => setOpen(open === 'api' ? null : 'api')}>
          <ApiPanel />
        </Section>
        <Section title="Referral" open={open === 'referral'} onToggle={() => setOpen(open === 'referral' ? null : 'referral')}>
          <ReferralPanel />
        </Section>
      </div>

      <div className={`${panelClass} overflow-hidden`}>
        <Row label="Keluar" danger onClick={() => setModal('logout')} />
      </div>

      {modal === 'avatar' && <AvatarModal current={me.avatar} onClose={() => setModal(null)} onSaved={me.refresh} />}
      {modal === 'name' && <NameModal current={me.name} onClose={() => setModal(null)} onSaved={me.refresh} />}
      {modal === 'email' && <EmailModal current={me.email} onClose={() => setModal(null)} onSaved={me.refresh} />}

      <ConfirmModal
        open={modal === 'logout'}
        title="Keluar dari akun?"
        message="Kamu perlu masuk lagi lengkap dengan kode OTP dan PIN untuk membuka akun ini."
        confirmLabel="Ya, keluar" cancelLabel="Batal" danger loading={loggingOut}
        onConfirm={handleLogout} onClose={() => !loggingOut && setModal(null)}
      />
    </div>
  );
}

export default function PengaturanPage() {
  return <AkunLayout title="Pengaturan"><Content /></AkunLayout>;
}

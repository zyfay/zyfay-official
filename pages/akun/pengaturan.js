// pages/akun/pengaturan.js — pengaturan akun
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import {
  User, Mail, Key, Gift, LogOut, Pencil, ChevronRight, ChevronDown, X, Loader2,
  Copy, Check, Share2, RefreshCw, Users, Coins,
} from 'lucide-react';
import AkunLayout, { useAkun } from '../../components/AkunLayout';
import Avatar, { AVATAR_ICONS, AVATAR_COLORS } from '../../components/Avatar';
import ConfirmModal from '../../components/ConfirmModal';
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

// ---- Kerangka modal, gaya sama dengan ConfirmModal Zyfay ----
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 pb-3">
          <h3 className="font-display font-bold">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 pt-2">{children}</div>
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
    <Modal title="Ubah Profil" onClose={onClose}>
      <div className="flex justify-center mb-5"><Avatar value={`${icon}:${color}`} size={84} /></div>

      <p className="text-muted text-xs mb-2">Ikon</p>
      <div className="grid grid-cols-6 gap-2 mb-4">
        {AVATAR_ICON_KEYS.map((k) => {
          const Icon = AVATAR_ICONS[k];
          return (
            <button key={k} onClick={() => setIcon(k)}
              className={`aspect-square rounded-xl flex items-center justify-center border transition-all ${
                icon === k ? 'bg-primary/20 border-primary text-white' : 'bg-card border-border text-muted hover:text-white'
              }`}>
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      <p className="text-muted text-xs mb-2">Warna</p>
      <div className="flex gap-2.5 mb-5">
        {AVATAR_COLOR_KEYS.map((k) => (
          <button key={k} onClick={() => setColor(k)} aria-label={k}
            className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[k]} flex items-center justify-center ${
              color === k ? 'ring-2 ring-white ring-offset-2 ring-offset-surface' : ''
            }`}>
            {color === k && <Check size={14} className="text-white" />}
          </button>
        ))}
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Simpan'}
      </button>
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
    <Modal title="Ubah Nama" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} className="input-field" placeholder="Nama baru" disabled={saving} autoFocus />
        <p className="text-muted text-xs">3-30 karakter. Nama dipakai juga buat login, jadi tidak boleh sama dengan akun lain.</p>
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? <Loader2 size={16} className="animate-spin" /> : 'Simpan'}
        </button>
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
    <Modal title="Ubah Email" onClose={onClose}>
      {step === 'input' ? (
        <form onSubmit={requestOtp} className="space-y-3">
          <p className="text-muted text-xs">Email sekarang: <span className="text-white">{current}</span></p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="Email baru" disabled={busy} autoFocus />
          <p className="text-muted text-xs">Untuk keamanan, kami kirim kode OTP ke WhatsApp yang terdaftar di akun ini.</p>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Loader2 size={16} className="animate-spin" /> : 'Kirim Kode OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-muted text-xs">Masukkan 6 digit kode yang dikirim ke WhatsApp {masked}.</p>
          <input
            inputMode="numeric" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="input-field text-center tracking-[0.5em] text-lg" placeholder="••••••" disabled={busy} autoFocus
          />
          <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full">
            {busy ? <Loader2 size={16} className="animate-spin" /> : 'Verifikasi & Ganti Email'}
          </button>
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

  if (!info) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-muted text-xs leading-relaxed">
        Pakai API Zyfay buat nyambungin toko, bot, atau aplikasi kamu sendiri. Kirim key lewat header <code className="text-primary-glow">x-api-key</code>.
      </p>

      <div>
        <div className="text-muted text-xs mb-1">Base URL</div>
        <div className="flex items-center justify-between gap-2 bg-surface border border-border rounded-xl px-3 py-2.5">
          <span className="font-mono text-xs truncate">{base}/api/app</span>
          <button onClick={() => copy(`${base}/api/app`)} className="text-primary-glow flex-shrink-0"><Copy size={14} /></button>
        </div>
      </div>

      {newKey && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          <div className="text-emerald-400 text-xs font-semibold mb-1.5">API key baru — simpan sekarang, tidak akan ditampilkan lagi</div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs break-all">{newKey}</span>
            <button onClick={() => copy(newKey, 'API key disalin')} className="text-emerald-400 flex-shrink-0"><Copy size={14} /></button>
          </div>
        </div>
      )}

      {info.hasKey && !newKey && (
        <div>
          <div className="text-muted text-xs mb-1">API key kamu</div>
          <div className="bg-surface border border-border rounded-xl px-3 py-2.5 font-mono text-xs">{info.masked}</div>
          <div className="text-muted text-[11px] mt-1.5">
            Dibuat {new Date(info.created_at).toLocaleDateString('id-ID')}
            {info.last_used_at ? ` · terakhir dipakai ${new Date(info.last_used_at).toLocaleDateString('id-ID')}` : ' · belum pernah dipakai'}
          </div>
        </div>
      )}

      {info.error && <p className="text-red-400 text-xs">{info.error}</p>}

      <button onClick={() => (info.hasKey ? setConfirmOpen(true) : generate())} disabled={busy} className="btn-secondary w-full text-sm">
        {busy ? <Loader2 size={14} className="animate-spin" /> : info.hasKey ? <><RefreshCw size={14} /> Buat Ulang Key</> : <><Key size={14} /> Buat API Key</>}
      </button>

      <div>
        <div className="text-muted text-xs mb-1.5">Endpoint yang tersedia</div>
        <div className="space-y-1.5 text-xs font-mono">
          {[
            ['GET', '/games'], ['GET', '/products?game_id=…'], ['GET', '/flash-sales'],
            ['POST', '/orders/create'], ['GET', '/orders/check?id=…'], ['POST', '/cekid-game'],
          ].map(([m, p]) => (
            <div key={p} className="flex items-center gap-2 bg-surface border border-border rounded-lg px-2.5 py-1.5">
              <span className={`font-semibold ${m === 'GET' ? 'text-emerald-400' : 'text-sky-400'}`}>{m}</span>
              <span className="truncate">{p}</span>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen} title="Buat ulang API key?"
        message="Key yang lama langsung tidak berlaku. Semua aplikasi yang masih memakainya akan berhenti bisa mengakses."
        confirmLabel="Ya, Buat Ulang" danger loading={busy}
        onConfirm={generate} onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

// ---- Panel Referral ----
function ReferralPanel() {
  const [data, setData] = useState(null);
  useEffect(() => { api('/api/akun/referral', 'GET').then(setData).catch((e) => { toast.error(e.message); setData({ code: null, invited: 0, totalBonus: 0, bonusPerInvite: 0 }); }); }, []);

  if (!data) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-primary" /></div>;

  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/akun/daftar?ref=${data.code}`;

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Zyfay Official', text: `Daftar di Zyfay pakai kode referralku ${data.code} dan dapat bonus saldo!`, url: link }); return; }
      catch { /* dibatalkan user */ }
    }
    copy(link, 'Link referral disalin');
  }

  return (
    <div className="space-y-4">
      <p className="text-muted text-xs leading-relaxed">
        Setiap teman yang daftar pakai kodemu, kamu <b className="text-white">dan</b> temanmu sama-sama dapat <b className="text-white">{rupiah(data.bonusPerInvite)}</b> saldo.
      </p>

      <div className="bg-surface border border-border rounded-xl p-4 text-center">
        <div className="text-muted text-xs mb-1">Kode referral kamu</div>
        <div className="font-display text-2xl font-bold tracking-widest text-primary-glow mb-3">{data.code}</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => copy(data.code, 'Kode disalin')} className="btn-secondary text-xs py-2"><Copy size={13} /> Salin Kode</button>
          <button onClick={share} className="btn-primary text-xs py-2"><Share2 size={13} /> Bagikan Link</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface border border-border rounded-xl p-3">
          <div className="text-muted text-xs flex items-center gap-1.5 mb-1"><Users size={12} /> Teman diajak</div>
          <div className="font-display text-lg font-bold">{data.invited}</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3">
          <div className="text-muted text-xs flex items-center gap-1.5 mb-1"><Coins size={12} /> Total bonus</div>
          <div className="font-display text-lg font-bold">{rupiah(data.totalBonus)}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-card-hover transition-colors text-left">
      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-primary-glow" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {value && <div className="text-muted text-xs truncate">{value}</div>}
      </div>
      <ChevronRight size={16} className="text-muted flex-shrink-0" />
    </button>
  );
}

function Section({ icon: Icon, title, subtitle, open, onToggle, children }) {
  return (
    <div className="card overflow-hidden mb-4">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-card-hover transition-colors text-left">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-primary-glow" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-muted text-xs">{subtitle}</div>
        </div>
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-border/60">{children}</div>}
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
    <div>
      {/* Profil */}
      <div className="card p-5 mb-4 flex items-center gap-4">
        <button onClick={() => setModal('avatar')} className="relative flex-shrink-0" aria-label="Ubah profil">
          <Avatar value={me.avatar} size={72} />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-card flex items-center justify-center">
            <Pencil size={11} className="text-white" />
          </span>
        </button>
        <div className="min-w-0">
          <div className="font-display font-bold text-lg truncate">{me.name}</div>
          <div className="text-muted text-xs truncate">{me.email}</div>
          <div className="text-muted text-xs">{me.phone}</div>
        </div>
      </div>

      <div className="card divide-y divide-border/60 overflow-hidden mb-4">
        <Row icon={User} label="Nama" value={me.name} onClick={() => setModal('name')} />
        <Row icon={Mail} label="Email" value={me.email} onClick={() => setModal('email')} />
      </div>

      <Section icon={Key} title="API Zyfay" subtitle="Hubungkan toko atau aplikasimu" open={open === 'api'} onToggle={() => setOpen(open === 'api' ? null : 'api')}>
        <ApiPanel />
      </Section>

      <Section icon={Gift} title="Referral" subtitle="Ajak teman, dapat bonus saldo" open={open === 'referral'} onToggle={() => setOpen(open === 'referral' ? null : 'referral')}>
        <ReferralPanel />
      </Section>

      <button
        onClick={() => setModal('logout')}
        className="w-full card flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/10 hover:border-red-500/30 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
          <LogOut size={16} className="text-red-400" />
        </div>
        <span className="text-sm font-medium text-red-400">Keluar</span>
      </button>

      {modal === 'avatar' && <AvatarModal current={me.avatar} onClose={() => setModal(null)} onSaved={me.refresh} />}
      {modal === 'name' && <NameModal current={me.name} onClose={() => setModal(null)} onSaved={me.refresh} />}
      {modal === 'email' && <EmailModal current={me.email} onClose={() => setModal(null)} onSaved={me.refresh} />}

      <ConfirmModal
        open={modal === 'logout'}
        title="Keluar dari akun?"
        message="Kamu perlu masuk lagi lengkap dengan kode OTP dan PIN untuk membuka akun ini."
        confirmLabel="Ya, Keluar" cancelLabel="Batal" danger loading={loggingOut}
        onConfirm={handleLogout} onClose={() => !loggingOut && setModal(null)}
      />
    </div>
  );
}

export default function PengaturanPage() {
  return <AkunLayout title="Pengaturan"><Content /></AkunLayout>;
}

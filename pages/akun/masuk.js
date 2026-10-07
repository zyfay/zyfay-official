// pages/akun/masuk.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function MasukPage() {
  const router = useRouter();
  const [step, setStep] = useState('credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSubmitCredentials(e) {
    e.preventDefault();
    if (!identifier.trim() || !password || !phone.trim()) { toast.error('Semua field wajib diisi'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, phone }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message);
      toast.success('Kode OTP terkirim ke WhatsApp kamu');
      setStep('otp');
      setResendCooldown(60);
    } catch (e) {
      toast.error(e.message || 'Gagal login');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) { toast.error('Kode OTP harus 6 digit'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message);
      router.push(res.hasPin ? '/akun/pin' : '/akun/pin/buat');
    } catch (e) {
      toast.error(e.message || 'Verifikasi gagal');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'login' }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message);
      toast.success('Kode OTP dikirim ulang');
      setResendCooldown(60);
    } catch (e) {
      toast.error(e.message || 'Gagal kirim ulang');
    }
  }

  return (
    <>
      <Head><title>Masuk | Zyfay Official</title></Head>
      <div className="min-h-screen flex flex-col justify-between py-10 px-6">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col">
          <button onClick={() => step === 'otp' ? setStep('credentials') : router.push('/akun')} className="btn-ghost mb-6 self-start">
            <ArrowLeft size={18} /> Kembali
          </button>

          {step === 'credentials' ? (
            <>
              <h1 className="font-display text-2xl font-bold mb-1">Silahkan isi untuk masuk ya!</h1>
              <p className="text-muted text-sm mb-6">Masukkan data akun kamu</p>
              <form onSubmit={handleSubmitCredentials} className="space-y-3">
                <input type="text" placeholder="Masukan nama/email" value={identifier} onChange={e => setIdentifier(e.target.value)} className="input-field" disabled={loading} />
                <input type="password" placeholder="Masukan password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" disabled={loading} />
                <input type="text" placeholder="Masukan no hp" value={phone} onChange={e => setPhone(e.target.value)} className="input-field" disabled={loading} />
                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Masuk'}
                </button>
              </form>
              <Link href="/akun/lupa-password" className="text-primary-glow text-sm text-center block mt-4 hover:underline">
                Lupa password login?
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold mb-1">Verifikasi OTP</h1>
              <p className="text-muted text-sm mb-6">Kode OTP udah dikirim ke WhatsApp nomor {phone}</p>
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <input
                  type="text" inputMode="numeric" maxLength={6} placeholder="Masukan 6 digit OTP"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center tracking-[0.5em] text-lg" disabled={loading}
                />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Masuk'}
                </button>
              </form>
              <button onClick={handleResend} disabled={resendCooldown > 0} className="text-primary-glow text-sm text-center block mt-4 w-full disabled:text-muted hover:underline">
                {resendCooldown > 0 ? `Kirim ulang (${resendCooldown}s)` : 'Kirim ulang OTP'}
              </button>
            </>
          )}
        </div>

        <div className="text-center text-xs text-muted space-y-2 mt-10">
          <div className="space-x-2">
            <a href="#" className="hover:text-white transition-colors">Ketentuan layanan</a>
            <span>•</span>
            <a href="#" className="hover:text-white transition-colors">Kebijakan privasi</a>
          </div>
          <p>© Zyfay Official - All Right Reserved</p>
        </div>
      </div>
    </>
  );
}

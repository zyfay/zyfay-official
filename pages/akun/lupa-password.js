// pages/akun/lupa-password.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function LupaPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSubmitEmail(e) {
    e.preventDefault();
    if (!email.trim()) { toast.error('Masukkan email dulu'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message);
      toast.success('Kalau email terdaftar, OTP udah dikirim ke WhatsApp kamu');
      setMaskedPhone(res.maskedPhone || '');
      setStep('reset');
      setResendCooldown(60);
    } catch (e) {
      toast.error(e.message || 'Gagal mengirim OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) { toast.error('Kode OTP harus 6 digit'); return; }
    if (newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    if (newPassword !== confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp, newPassword }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message);
      toast.success('Password berhasil diubah, silakan login');
      router.push('/akun/masuk');
    } catch (e) {
      toast.error(e.message || 'Gagal reset password');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message);
      toast.success('OTP dikirim ulang');
      setResendCooldown(60);
    } catch (e) {
      toast.error(e.message || 'Gagal kirim ulang');
    }
  }

  return (
    <>
      <Head><title>Lupa Password | Zyfay Official</title></Head>
      <div className="min-h-screen flex flex-col justify-between py-10 px-6">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col">
          <button onClick={() => step === 'reset' ? setStep('email') : router.push('/akun/masuk')} className="btn-ghost mb-6 self-start">
            <ArrowLeft size={18} /> Kembali
          </button>

          {step === 'email' ? (
            <>
              <h1 className="font-display text-xl font-bold mb-1">Lupa password akun?</h1>
              <p className="text-muted text-sm mb-6">Silahkan masukan emailmu, OTP bakal dikirim ke nomor WA terdaftar</p>
              <form onSubmit={handleSubmitEmail} className="space-y-3">
                <input type="email" placeholder="Masukan email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" disabled={loading} />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Kirim OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="font-display text-xl font-bold mb-1">Reset Password</h1>
              <p className="text-muted text-sm mb-6">
                Masukkan OTP yang dikirim ke WhatsApp {maskedPhone && `(${maskedPhone})`} dan password baru kamu
              </p>
              <form onSubmit={handleReset} className="space-y-3">
                <input
                  type="text" inputMode="numeric" maxLength={6} placeholder="Masukan 6 digit OTP"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center tracking-[0.5em] text-lg" disabled={loading}
                />
                <input type="password" placeholder="Password baru" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" disabled={loading} />
                <input type="password" placeholder="Ulangi password baru" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field" disabled={loading} />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Password Baru'}
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

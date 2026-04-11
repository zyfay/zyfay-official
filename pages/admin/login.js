// pages/admin/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Zap, LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        document.cookie = `admin_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        toast.success('Login berhasil!');
        router.push('/admin/dashboard');
      } else {
        toast.error(data.message || 'Login gagal');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  return (
    <>
      <Head><title>Admin Login | {siteName}</title></Head>
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        {/* BG glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/15 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
              <Zap size={28} className="text-white" fill="white" />
            </div>
            <h1 className="font-display text-3xl font-bold">{siteName}</h1>
            <p className="text-muted text-sm mt-1">Admin Dashboard</p>
          </div>

          <div className="card p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-white/80">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="admin"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5 text-white/80">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="input-field pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Masuk...</>
                  : <><LogIn size={16} /> Masuk ke Dashboard</>
                }
              </button>
            </form>
          </div>
          <p className="text-center text-muted text-xs mt-4">Akses khusus administrator</p>
        </div>
      </div>
    </>
  );
}

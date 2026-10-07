// pages/akun/pin/index.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Zap } from 'lucide-react';
import PinPad from '../../../components/PinPad';

export default function PinEntryPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then((res) => {
      if (!res.success) { router.replace('/akun/masuk'); return; }
      if (!res.hasPin) { router.replace('/akun/pin/buat'); return; }
      setName(res.name);
    });
  }, []);

  useEffect(() => {
    if (pin.length === 6) handleVerify();
  }, [pin]);

  async function handleVerify() {
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/pin/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message);
      router.push('/akun/saldo');
    } catch (e) {
      toast.error(e.message || 'PIN salah');
      setPin('');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      <Head><title>Masukkan PIN | Zyfay Official</title></Head>
      <div className="min-h-screen flex flex-col justify-between py-10 px-6">
        <div />
        <div className="w-full max-w-sm mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-5">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="font-display text-xl font-bold mb-1">Masukan Pin</h1>
          {name && <p className="text-muted text-sm mb-8">Halo, {name}</p>}
          <PinPad value={pin} onChange={verifying ? () => {} : setPin} />
          <Link href="/akun/pin/lupa" className="text-primary-glow text-sm inline-block mt-10 hover:underline">
            Lupa kode pin?
          </Link>
        </div>

        <div className="text-center text-xs text-muted space-y-2">
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

// pages/akun/pin/buat.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import toast from 'react-hot-toast';
import PinPad from '../../../components/PinPad';

export default function PinSetupPage() {
  const router = useRouter();
  const [stage, setStage] = useState('create'); // 'create' | 'confirm'
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(value) {
    setPin(value);
    if (value.length === 6) {
      if (stage === 'create') {
        setFirstPin(value);
        setTimeout(() => { setStage('confirm'); setPin(''); }, 150);
      } else {
        handleConfirm(value);
      }
    }
  }

  async function handleConfirm(confirmPin) {
    if (confirmPin !== firstPin) {
      toast.error('PIN tidak cocok, coba lagi dari awal');
      setStage('create'); setFirstPin(''); setPin('');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/auth/pin/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: confirmPin }),
      }).then(r => r.json());
      if (!res.success) throw new Error(res.message);
      toast.success('PIN berhasil dibuat!');
      router.push('/akun/saldo');
    } catch (e) {
      toast.error(e.message || 'Gagal bikin PIN');
      setStage('create'); setFirstPin(''); setPin('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Head><title>Buat PIN | Zyfay Official</title></Head>
      <div className="min-h-screen flex flex-col justify-between py-10 px-6">
        <div />
        <div className="w-full max-w-sm mx-auto text-center">
          <h1 className="font-display text-xl font-bold mb-1">
            {stage === 'create' ? 'Buat Pin Baru Mu!' : 'Konfirmasi PIN Kamu'}
          </h1>
          <p className="text-muted text-sm mb-8">
            {stage === 'create' ? 'Pin ini dipakai buat buka halaman akun & saldo kamu' : 'Masukkan lagi PIN yang sama'}
          </p>
          <PinPad value={pin} onChange={saving ? () => {} : handleChange} />
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

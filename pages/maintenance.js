// pages/maintenance.js
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { Wrench, Zap } from 'lucide-react';

export default function Maintenance() {
  const [message, setMessage] = useState('Website sedang dalam maintenance. Mohon kembali lagi nanti.');
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Zyfay';

  useEffect(() => {
    let timer;
    async function check() {
      try {
        const res = await fetch('/api/admin/maintenance');
        const data = await res.json();
        if (data?.message) setMessage(data.message);
        if (data?.enabled === false) {
          window.location.href = '/';
          return;
        }
      } catch (e) { /* abaikan, coba lagi nanti */ }
      timer = setTimeout(check, 15000);
    }
    check();
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head><title>Maintenance | {siteName}</title></Head>
      <div className="min-h-screen bg-bg flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/15 rounded-full blur-[100px]" />
        <div className="text-center relative z-10 max-w-md">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
            <Wrench size={30} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">Sebentar ya!</h1>
          <p className="text-muted">{message}</p>
          <div className="flex items-center justify-center gap-2 mt-8 text-muted text-sm">
            <Zap size={14} className="text-primary" />
            <span>{siteName}</span>
          </div>
        </div>
      </div>
    </>
  );
}

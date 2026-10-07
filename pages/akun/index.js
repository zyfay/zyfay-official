// pages/akun/index.js
import Head from 'next/head';
import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function AkunWelcome() {
  return (
    <>
      <Head><title>Akun | Zyfay Official</title></Head>
      <div className="min-h-screen flex flex-col items-center justify-between py-10 px-6">
        <div />
        <div className="w-full max-w-sm text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-glow-sm">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Selamat Datang Di Zyfay Official</h1>
          <p className="text-muted text-sm mb-10">Mau daftar atau masuk dulu nih?</p>

          <div className="space-y-3">
            <Link href="/akun/daftar" className="btn-primary w-full">Daftar</Link>
            <Link href="/akun/masuk" className="btn-secondary w-full">Masuk</Link>
          </div>
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

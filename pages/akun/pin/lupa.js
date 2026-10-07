// pages/akun/pin/lupa.js
import Head from 'next/head';
import { useRouter } from 'next/router';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';

export default function LupaPinPage() {
  const router = useRouter();
  return (
    <>
      <Head><title>Lupa PIN | Zyfay Official</title></Head>
      <div className="min-h-screen flex flex-col justify-between py-10 px-6">
        <div className="w-full max-w-sm mx-auto flex-1">
          <button onClick={() => router.back()} className="btn-ghost mb-6">
            <ArrowLeft size={18} /> Kembali
          </button>

          <h1 className="font-display text-xl font-bold mb-2">Lupa kode PIN?</h1>
          <p className="text-muted text-sm mb-8">
            Jika lupa kode PIN, kamu bisa laporkan ke pihak CS kami lewat salah satu cara di bawah ya 🙏
          </p>

          <div className="space-y-3">
            <a
              href="https://t.me/zyfaycc" target="_blank" rel="noopener noreferrer"
              className="card p-4 flex items-center gap-3 hover:bg-card-hover transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0">
                <Send size={18} className="text-sky-400" />
              </div>
              <div>
                <div className="font-semibold text-sm">Telegram</div>
                <div className="text-muted text-xs">@zyfaycc</div>
              </div>
            </a>

            <button
              onClick={() => router.push('/')}
              className="card p-4 flex items-center gap-3 hover:bg-card-hover transition-colors w-full text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <MessageCircle size={18} className="text-primary-glow" />
              </div>
              <div>
                <div className="font-semibold text-sm">Live Chat Website</div>
                <div className="text-muted text-xs">Chat langsung di web kami</div>
              </div>
            </button>
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

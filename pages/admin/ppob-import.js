// pages/admin/ppob-import.js
// Halaman admin buat impor produk PPOB dari TokoVoucher (nyaman dipakai dari HP).
// Buka: /admin/ppob-import  (harus sudah login admin)
import { useState } from 'react';
import Head from 'next/head';
import { Loader2, Eye, Download, ArrowLeft } from 'lucide-react';

const rupiah = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

export default function PpobImport() {
  const [form, setForm] = useState({ margin_percent: '3', margin_flat: '0', round_to: '100', update_prices: false });
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function run(preview) {
    if (!preview && !window.confirm('Impor produk ke database sekarang? Produk yang sudah ada tidak dihapus.')) return;
    setBusy(preview ? 'preview' : 'import');
    setError('');
    try {
      const res = await fetch('/api/admin/ppob/import', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, preview }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 401) { setError('Belum login admin. Login dulu di /admin/login lalu buka halaman ini lagi.'); setResult(null); }
      else if (!data) { setError(`Server membalas tidak valid (HTTP ${res.status})`); setResult(null); }
      else { if (!data.success) setError(data.message || 'Gagal'); setResult(data); }
    } catch (e) {
      setError('Gagal menghubungi server: ' + e.message);
    }
    setBusy('');
  }

  const field = (key, label, hint) => (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        inputMode="decimal"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="input-field mt-1"
      />
      <span className="text-muted text-xs">{hint}</span>
    </label>
  );

  return (
    <>
      <Head><title>Impor Produk PPOB | Zyfay Admin</title></Head>
      <div className="min-h-screen bg-bg text-white px-4 py-6">
        <div className="max-w-xl mx-auto space-y-4">
          <a href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-muted text-sm"><ArrowLeft size={14} /> Dashboard</a>
          <h1 className="font-display text-2xl font-bold">Impor Produk PPOB</h1>
          <p className="text-muted text-sm">
            Ambil pulsa, paket data, token PLN, e-wallet, voucher hiburan, dan tagihan dari TokoVoucher ke tabel produk
            (game_id <code>ppob-*</code>). Mulai dari <b>Preview</b> dulu, tidak ada yang ditulis.
          </p>

          <div className="card p-4 space-y-3">
            {field('margin_percent', 'Margin (%)', 'Ditambahkan ke harga modal, mis. 3')}
            {field('margin_flat', 'Margin tetap (Rp)', 'Ditambahkan setelah margin %, mis. 0 atau 500')}
            {field('round_to', 'Pembulatan ke atas (Rp)', 'Harga jual dibulatkan ke kelipatan ini, mis. 100')}
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.update_prices} onChange={e => setForm(f => ({ ...f, update_prices: e.target.checked }))} className="mt-1" />
              <span>Perbarui harga produk yang SUDAH ada<br /><span className="text-muted text-xs">Biarkan mati kalau lo pernah ubah harga manual, supaya tidak tertimpa.</span></span>
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={() => run(true)} disabled={!!busy} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              {busy === 'preview' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Preview
            </button>
            <button onClick={() => run(false)} disabled={!!busy} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {busy === 'import' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Impor
            </button>
          </div>

          {error && <div className="card p-3 text-sm text-red-400">{error}</div>}

          {result?.groups && (
            <div className="card p-4 space-y-3">
              <div className="font-semibold">
                {result.mode === 'import'
                  ? `Selesai: ${result.inserted} baru, ${result.updated} diperbarui, ${result.unchanged} tetap`
                  : `Preview: ${result.to_import} produk siap diimpor (dari ${result.tokovoucher?.total_tv} produk TokoVoucher)`}
              </div>
              {result.errors?.length > 0 && <div className="text-red-400 text-xs">{result.errors.join(' | ')}</div>}
              <div className="divide-y divide-border">
                {Object.entries(result.groups).map(([id, g]) => (
                  <div key={id} className="py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{g.name}{g.postpaid ? ' (pascabayar)' : ''}</span>
                      <span className="text-muted">{g.total} produk</span>
                    </div>
                    <div className="text-muted text-xs">{id}</div>
                    {g.sample.map(s => (
                      <div key={s.code} className="text-xs text-muted flex justify-between">
                        <span>{s.code} · {s.name}</span>
                        <span>{g.postpaid ? 'nominal via inquiry' : `${rupiah(s.modal)} → ${rupiah(s.jual)}`}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <details>
                <summary className="text-sm cursor-pointer">Kategori di TokoVoucher ({result.categories_seen?.length})</summary>
                <div className="mt-2 text-xs text-muted space-y-0.5">
                  {result.categories_seen?.map(c => (
                    <div key={c.nama} className="flex justify-between"><span>{c.nama}</span><span>{c.ppob}/{c.total} masuk PPOB</span></div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

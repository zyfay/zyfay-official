// components/akunUi.js
// Komponen kecil & datar khusus area akun. Sengaja TIDAK memakai class global btn-*/card/badge-*
// karena ukurannya besar; di sini semuanya ringkas: tinggi 32-40px, sudut kecil, tanpa glow.
import { Loader2 } from 'lucide-react';

const BTN_BASE = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SIZE = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm' };
const BTN_VARIANT = {
  primary:   'bg-primary hover:bg-primary-light text-white',
  secondary: 'bg-card hover:bg-card-hover border border-border text-white',
  danger:    'bg-card hover:bg-red-500/10 border border-border text-red-400',
  ghost:     'text-muted hover:text-white',
};

// Untuk <Link>/<a> yang tampilannya mau seperti tombol
export const btnClass = (variant = 'primary', size = 'md', extra = '') =>
  `${BTN_BASE} ${BTN_SIZE[size]} ${BTN_VARIANT[variant]} ${extra}`;

export function Btn({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }) {
  return (
    <button className={btnClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : children}
    </button>
  );
}

export const inputClass =
  'w-full h-10 px-3 rounded-lg bg-card border border-border text-sm text-white placeholder-muted focus:outline-none focus:border-primary-light transition-colors disabled:opacity-60';

// Kotak datar
export const panelClass = 'rounded-xl border border-border bg-card';

// Judul bagian: kecil, huruf kapital, redup (bukan judul besar)
export function Label({ children, className = '' }) {
  return <div className={`text-[11px] uppercase tracking-wider text-muted ${className}`}>{children}</div>;
}

// Status berupa teks berwarna kecil, bukan pil
export const STATUS = {
  pending:    { label: 'Menunggu',   color: 'text-amber-400' },
  processing: { label: 'Diproses',   color: 'text-sky-400' },
  success:    { label: 'Berhasil',   color: 'text-emerald-400' },
  failed:     { label: 'Gagal',      color: 'text-red-400' },
  cancelled:  { label: 'Dibatalkan', color: 'text-red-400' },
};

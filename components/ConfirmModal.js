// components/ConfirmModal.js
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  open,
  title = 'Konfirmasi',
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden animate-[fadeIn_0.15s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              danger ? 'bg-red-500/15 text-red-400' : 'bg-primary/15 text-primary-glow'
            }`}>
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="font-display font-bold text-base">{title}</h3>
              {message && <p className="text-muted text-sm mt-1.5 leading-relaxed">{message}</p>}
            </div>
            <button onClick={onClose} className="text-muted hover:text-white flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} disabled={loading} className="btn-secondary flex-1 text-sm">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 text-sm rounded-xl py-2.5 font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
              danger ? 'bg-red-500 hover:bg-red-600 text-white' : 'btn-primary'
            }`}
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Memproses...</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
    }

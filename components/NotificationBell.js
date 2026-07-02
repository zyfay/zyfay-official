// components/NotificationBell.js
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCheck, Trash2, Megaphone, Info, Wrench } from 'lucide-react';
import { getReadIds, getDeletedIds, markAllRead, deleteNotif, deleteAllNotif } from '../lib/notifState';

const typeIcon = {
  promo: <Megaphone size={15} className="text-primary-glow" />,
  system: <Wrench size={15} className="text-amber-400" />,
  info: <Info size={15} className="text-sky-400" />,
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      const deleted = getDeletedIds();
      const visible = (data.notifications || []).filter(n => !deleted.includes(n.id));
      setNotifs(visible);
      setReadIds(getReadIds());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  const unreadCount = notifs.filter(n => !readIds.includes(n.id)).length;

  function handleOpen() {
    setOpen(o => !o);
  }

  function handleMarkAllRead() {
    markAllRead(notifs.map(n => n.id));
    setReadIds(getReadIds());
  }

  function handleDeleteOne(id) {
    deleteNotif(id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  function handleDeleteAll() {
    deleteAllNotif(notifs.map(n => n.id));
    setNotifs([]);
  }

  function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  }

  const modalContent = open && (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[380px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Bell size={15} /> Pemberitahuan
          </div>
          <button onClick={() => setOpen(false)} className="text-muted hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center text-muted text-sm">Memuat...</div>
          ) : notifs.length === 0 ? (
            <div className="py-10 text-center text-muted">
              <Bell size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tidak ada pemberitahuan</p>
            </div>
          ) : (
            notifs.map(n => {
              const isRead = readIds.includes(n.id);
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 border-b border-border last:border-0 ${!isRead ? 'bg-primary/5' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-card-hover flex items-center justify-center flex-shrink-0 mt-0.5">
                    {typeIcon[n.type] || typeIcon.info}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{n.title}</div>
                      {!isRead && <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0" />}
                    </div>
                    {n.message && <p className="text-muted text-xs mt-0.5 leading-relaxed">{n.message}</p>}
                    <div className="text-muted/60 text-[11px] mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteOne(n.id)}
                    className="text-muted hover:text-red-400 flex-shrink-0 self-start p-1"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {notifs.length > 0 && (
          <div className="flex gap-2 p-3 border-t border-border">
            <button
              onClick={handleMarkAllRead}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-primary-glow hover:bg-primary/10 rounded-lg py-2 transition-colors"
            >
              <CheckCheck size={14} /> Tandai Baca Semua
            </button>
            <button
              onClick={handleDeleteAll}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg py-2 transition-colors"
            >
              <Trash2 size={14} /> Hapus Semua
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-white hover:bg-card transition-colors"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-surface" />
        )}
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </div>
  );
}

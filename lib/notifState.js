// lib/notifState.js
// Notifikasi disiarkan (broadcast) dari admin ke semua pengunjung. Karena
// situs belum punya sistem akun user, status "dibaca" / "dihapus" disimpan
// per-perangkat via localStorage, bukan di server.

const READ_KEY = 'zyfay_notif_read_v1';
const DELETED_KEY = 'zyfay_notif_deleted_v1';

function getIds(key) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function setIds(key, ids) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
}

export function getReadIds() { return getIds(READ_KEY); }
export function getDeletedIds() { return getIds(DELETED_KEY); }

export function markRead(id) {
  const ids = getReadIds();
  if (!ids.includes(id)) setIds(READ_KEY, [...ids, id]);
}

export function markAllRead(allIds) {
  const ids = new Set([...getReadIds(), ...allIds]);
  setIds(READ_KEY, [...ids]);
}

export function deleteNotif(id) {
  const ids = getDeletedIds();
  if (!ids.includes(id)) setIds(DELETED_KEY, [...ids, id]);
}

export function deleteAllNotif(allIds) {
  const ids = new Set([...getDeletedIds(), ...allIds]);
  setIds(DELETED_KEY, [...ids]);
}

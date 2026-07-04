// components/MaintenanceWatcher.js
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const CHECK_INTERVAL = 8000; // 8 detik, cukup responsif tanpa bikin API kebanjiran

export default function MaintenanceWatcher() {
  const router = useRouter();
  const intervalRef = useRef();

  useEffect(() => {
    async function check() {
      // Jangan redirect kalau lagi di halaman maintenance atau area admin —
      // admin harus tetap bisa akses dashboard buat matiin maintenance-nya.
      if (router.pathname === '/maintenance' || router.pathname.startsWith('/admin')) return;
      try {
        const res = await fetch('/api/admin/maintenance');
        const data = await res.json();
        if (data?.enabled) {
          window.location.href = '/maintenance';
        }
      } catch (e) {
        // Diamkan, coba lagi di interval berikutnya
      }
    }
    intervalRef.current = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [router.pathname]);

  return null;
}

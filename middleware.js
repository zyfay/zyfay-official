// middleware.js (taruh di ROOT project, sejajar dengan pages/, bukan di dalam pages/)
import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Halaman/route yang TIDAK ikut digate, supaya admin tetap bisa login &
// toggle maintenance off, dan API (termasuk webhook Midtrans) tetap jalan.
export const config = {
  matcher: [
    '/((?!api|admin|maintenance|_next/static|_next/image|favicon.ico|images|fonts).*)',
  ],
};

export async function middleware(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return NextResponse.next();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/site_settings?key=eq.maintenance&select=value`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) return NextResponse.next();

    const rows = await res.json();
    const enabled = rows?.[0]?.value?.enabled;

    if (enabled) {
      const url = req.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.rewrite(url);
    }
  } catch (e) {
    // Fail-open: kalau gagal cek ke Supabase, jangan sampai website ikut down.
    console.error('Maintenance check failed:', e);
  }

  return NextResponse.next();
}

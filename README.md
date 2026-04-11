# Zyfay v2 — Top Up Game Platform

Tema purple Zyfay, database Supabase, payment Midtrans otomatis, live chat realtime, admin panel lengkap.

## Stack
- **Next.js 14** — Framework
- **Supabase** — Database PostgreSQL + Realtime + Storage (gratis)
- **Midtrans** — Payment gateway (QRIS, GoPay, OVO, VA Bank, dll)
- **TokoVoucher** — Backend top up otomatis
- **Vercel** — Deploy

---

## Setup (wajib sebelum deploy)

### 1. Supabase (Database)
1. Daftar di https://supabase.com (gratis)
2. Buat project baru
3. Buka **SQL Editor** → paste isi file `supabase/schema.sql` → Run
4. Buka **Storage** → buat bucket bernama `images` → set Public
5. Catat: Project URL, anon key, service role key (di Settings → API)

### 2. Midtrans (Payment)
1. Daftar di https://midtrans.com
2. Mode Sandbox dulu untuk testing
3. Catat Server Key & Client Key (di Settings → Access Keys)
4. Set Webhook URL di Midtrans: `https://domain-kamu.vercel.app/api/payments/midtrans-webhook`

### 3. TokoVoucher
1. Daftar reseller di https://tokovoucher.id
2. Aktifkan API di menu Developer
3. Catat Member Code & Secret Key

### 4. Deploy ke Vercel
1. Push code ke GitHub
2. Import di vercel.com
3. Set semua Environment Variables (lihat .env.local.example)
4. Deploy!

---

## Environment Variables

| Key | Keterangan |
|-----|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (rahasia!) |
| `MIDTRANS_SERVER_KEY` | Server key Midtrans |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Client key Midtrans |
| `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` | `false` untuk sandbox, `true` untuk live |
| `TOKOVOUCHER_MEMBER_CODE` | Member code TokoVoucher |
| `TOKOVOUCHER_SECRET_KEY` | Secret key TokoVoucher |
| `JWT_SECRET` | String random untuk keamanan JWT |
| `ADMIN_USERNAME` | Username login admin |
| `ADMIN_PASSWORD` | Password login admin |
| `NEXT_PUBLIC_SITE_NAME` | Nama website (Zyfay) |
| `NEXT_PUBLIC_SITE_URL` | URL website lengkap |

---

## Fitur Admin
- **Overview** — Statistik pesanan, saldo TokoVoucher
- **Pesanan** — Lihat & ubah status semua transaksi
- **Produk** — Tambah/edit/hapus produk + upload foto
- **Games** — Tambah/edit/hapus game + upload cover
- **Live Chat** — Balas chat user secara realtime (Supabase Realtime)

## URL Penting
- Website: `https://domain-kamu.vercel.app`
- Admin: `https://domain-kamu.vercel.app/admin/login`
- Cek Pesanan: `https://domain-kamu.vercel.app/cek-pesanan`
- Midtrans Webhook: `https://domain-kamu.vercel.app/api/payments/midtrans-webhook`

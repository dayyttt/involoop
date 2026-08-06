# Involoop

Invoicing untuk freelancer solo dan micro-agency. Setiap invoice yang dikirim
membawa jalur referral yang aktif saat klien membuka halaman itu untuk
membayar — bukan fitur promosi terpisah.

**Live:** https://involoop.vercel.app

## Masalah yang diselesaikan

Freelancer sudah rutin mengirim invoice kepada profesional dan bisnis lain,
tetapi setiap invoice berhenti sebagai transaksi dan tidak pernah menjadi
jalur distribusi. Padahal penerima invoice adalah audiens yang relevan, hadir
di momen bernilai tinggi, dan sering menjalankan bisnis jasa sendiri.

## Distribution loop (theme requirement)

```text
A buat invoice (1 kalimat, AI parse) → link publik
B buka invoice → lihat detail → konfirmasi pembayaran
B klik CTA referral → /signup?ref_invoice=<public_id>
Sistem mencatat referral + kredit kedua pihak
A lihat bukti di dashboard (views, signup, ledger)
```

Reward: A mendapat **+3 kredit** per referral, B mendapat **3 kredit awal + 2 bonus**.
1 kredit = 1 invoice publik.

## AI di dalam produk

Pembuatan invoice pakai satu kalimat natural. Claude API mem-parse jadi field
terstruktur DAN menulis satu baris CTA referral yang kontekstual dengan jenis
jasa. Lihat `lib/claude.ts`. Ada fallback form manual bila AI gagal.

## Tech stack

- Next.js 14 (App Router, server actions via API routes)
- Supabase (Postgres + Auth + RLS)
- three.js (hero WebGL neon landscape)
- Claude API / Anthropic SDK
- Deploy: Vercel

## Arsitektur singkat

```text
app/
  page.tsx                    Landing
  signup|login                Auth pages
  dashboard                   Proof loop: stats, ledger, referral, invoice
  invoice/[id]                Halaman invoice publik (distribution surface)
  api/signup                  Buat user + finalize_signup (RPC transaksional)
  api/invoices/create         AI parse → publish_invoice (RPC, potong kredit)
  api/invoices/pay            B konfirmasi transfer → awaiting_verification
  api/invoices/verify         A verifikasi → paid
  api/invoices/[public_id]    Read publik + tracking view (cookie)
  api/dashboard               Data dashboard (session + service role)
lib/
  claude.ts                   AI parse
  supabase-*.ts               Client admin / server / browser
supabase/schema.sql           Tabel, RLS, RPC (transaksional, anti-duplikasi)
```

Keamanan: semua mutasi mengambil `owner_id` dari session cookie, tidak pernah
dari body. Reward dilindungi constraint `UNIQUE(referred_user_id)` dan ledger
`UNIQUE(idempotency_key)`. Self-referral ditolak. Email dinormalisasi
lowercase. Publish + reward dikerjakan dalam fungsi Postgres transaksional.

## Cara menjalankan lokal

```bash
npm install
cp .env.example .env.local   # isi sesuai bagian bawah
npm run dev
```

Buka `http://localhost:3000`.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only, jangan expose ke client)
- `AI_API_KEY` (opsional `AI_BASE_URL` dan `AI_MODEL`)
- `NEXT_PUBLIC_BASE_URL` — `http://localhost:3000` lokal, atau URL deploy

## Setup Supabase

1. Buat project di supabase.com, buka SQL Editor.
2. Project baru: jalankan `supabase/schema.sql`. Project lama: jalankan
   `supabase/migration-p0.sql` sekali.
3. Salin Project URL, anon key, service_role key ke `.env.local`.
4. Authentication → Providers → pastikan Email/Password aktif.

## Demo account

Dibuat otomatis saat setup demo live:

```text
User A (freelancer):  demo-owner@involoop.app  /  involoop-demo-2026
User B (klien):       demo-client@involoop.app /  involoop-demo-2026
```

## Known limitations

- Pembayaran disimulasikan secara jujur: B konfirmasi transfer →
  `awaiting_verification` → A verifikasi → `paid`. Tidak ada gateway sungguhan.
- Anti-fraud minimal: unik per user + idempotent ledger. Reward berbasis
  kehadiran akun, bukan pada transaksi berbayar — mitigasi penuh di luar scope.
- Langganan berbayar (Starter/Pro) hanya informasi harga, belum diaktifkan.
- View invoice dicatat per browser (cookie), bukan per IP/akun.

## Model harga

Gratis: 3 invoice publik, +3 kredit per referral, +2 bonus untuk klien.
Starter Rp29.000: 10 invoice. Pro Rp79.000/bulan: 50 invoice.

## Strategi distribusi

100 pengguna pertama: freelance developer, designer, consultant, video editor,
dan micro-agency Indonesia yang rutin mengirim invoice ke sesama pelaku jasa
B2B — dijangkau lewat komunitas WhatsApp/Discord freelancer yang sudah dapat
diakses, direct outreach ke micro-agency pengguna invoice PDF manual, dan
sepuluh pengguna pilot yang masing-masing mengirim minimal tiga invoice nyata.

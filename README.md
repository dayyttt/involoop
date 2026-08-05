# Involoop

Invoicing untuk freelancer solo. Setiap invoice yang dikirim membawa jalur
referral yang aktif saat klien membuka halaman itu untuk membayar —
bukan fitur promosi terpisah yang harus dipromosikan aktif oleh freelancer.

## Distribution mechanism (theme requirement)

**Referral loop, tertanam di titik transaksi:**

1. Freelancer A membuat invoice lewat satu kalimat natural (AI mem-parse
   jadi field terstruktur + menulis satu baris CTA yang kontekstual
   dengan jenis jasa).
2. A mengirim link invoice ke klien B lewat channel apa pun (WA, email —
   di luar scope aplikasi ini secara sengaja, lihat bagian "Scope" di bawah).
3. B membuka halaman invoice untuk membayar. Di bawah tombol bayar, muncul
   CTA singkat mengajak B coba Involoop untuk bisnisnya sendiri, kalau
   relevan.
4. B klik → daftar lewat `/signup?ref_invoice=<public_id>`.
5. Sistem mencatat baris di tabel `referrals` dan langsung mengkreditkan
   A dengan kredit invoice tambahan.

Loop ini bisa didemokan penuh dalam < 2 menit: buka dua browser (A dan B),
tunjukkan A kirim invoice, B buka dan daftar dari CTA, kembali ke dashboard
A dan tunjukkan kreditnya sudah bertambah otomatis.

## AI di dalam produk

Pembuatan invoice tidak pakai form manual — freelancer ketik satu kalimat
("tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu"), Claude API
mem-parse jadi field invoice terstruktur DAN menulis satu baris CTA
referral yang disesuaikan dengan jenis jasa yang ditagih. Lihat `lib/claude.ts`.

## Auth

- Daftar di `/signup`, masuk di `/login`, keluar lewat tombol di dashboard.
- Semua mutasi API (`invoices/create`, `referrals`) mengambil `owner_id` dari
  session cookie server-side — tidak pernah dari body request. Klien yang
  belum login ditolak dengan 401.

## Scope yang sengaja tidak dibangun

- Tidak ada sistem pengiriman invoice sendiri (email/WA API) — freelancer
  memakai channel yang sudah biasa mereka pakai. Aplikasi hanya
  menghasilkan link publik.
- Pembayaran disimulasikan (tombol "Bayar sekarang" langsung menandai
  lunas) — dipilih supaya demo tidak bergantung pada gateway pembayaran
  eksternal yang bisa gagal saat presentasi.

## Setup

### 1. Supabase

1. Buat project baru di [supabase.com](https://supabase.com).
2. Buka SQL Editor, jalankan isi `supabase/schema.sql`.
3. Di Project Settings → API, salin `Project URL`, `anon public key`, dan
   `service_role key`.
4. Di Authentication → Providers, pastikan Email/Password aktif.

### 2. Environment variables

```bash
cp .env.example .env.local
```

Isi `.env.local` dengan:
- `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari Supabase
- `SUPABASE_SERVICE_ROLE_KEY` dari Supabase (jangan pernah expose ke client)
- `AI_API_KEY` (opsional `AI_BASE_URL` dan `AI_MODEL`) dari gateway AI-mu
  (9router, atau [console.anthropic.com](https://console.anthropic.com))
- `NEXT_PUBLIC_BASE_URL` — `http://localhost:3000` untuk lokal, atau URL
  deployment untuk production

### 3. Install & jalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

### 4. Deploy (untuk link demo live)

Termudah lewat [Vercel](https://vercel.com): import repo ini, isi
environment variables yang sama seperti `.env.local` di dashboard Vercel,
deploy.

## Alur pakai singkat

1. Daftar di `/signup` (tanpa `ref_invoice`, jadi user pertama).
2. Masuk `/dashboard` → klik "Buat invoice".
3. Ketik kalimat tagihan → dapat link invoice publik.
4. Buka link itu di browser/incognito lain → coba tombol "Bayar sekarang"
   → coba klik CTA referral di bawahnya → daftar sebagai user B.
5. Kembali ke dashboard user A → kredit invoice sudah bertambah otomatis,
   dan daftar referral (nama + tanggal) muncul di bagian "Referral".

## Target pengguna

Freelancer/konsultan solo yang menagih klien secara rutin (desainer,
developer, konsultan, video editor) — bukan agency besar dengan tim
finance, bukan retail yang jual produk sekali transaksi.

## Model harga

Free: 3 kredit invoice awal, tambah 3 kredit setiap referral berhasil. Klien
yang daftar lewat link referral-mu dapat bonus 2 kredit tambahan — kedua
pihak di loop dihargai.
Pro (rencana lanjutan, belum diimplementasi di scope hackathon): biaya
bulanan tetap untuk kredit invoice unlimited.

## Distribution strategy (satu paragraf, untuk submission)

100 pengguna pertama kami adalah freelancer solo aktif di komunitas
r/freelance, r/digitalnomad, dan komunitas Discord/Skool freelancer
seperti "Freelance to Founder" — audiens yang budayanya memang berjalan
dari referral klien, jadi pesannya relevan tanpa perlu penjelasan
tambahan. Ini hipotesis channel awal, belum tervalidasi lewat data,
dan disampaikan apa adanya ke juri.

Kamu bertindak sebagai Senior Blockchain Payment Engineer, Solana Engineer, Backend Engineer, dan QA Engineer.

Tugasmu menambahkan pembayaran USDC di jaringan Solana ke Involoop **untuk dua arah yang berbeda**, tanpa merusak alur PayPal yang sudah berjalan.

Jangan mengubah kode sebelum menyelesaikan FASE 1 (audit).

---

# 0. YANG BERUBAH DARI REVISI SEBELUMNYA

Dokumen versi lama menulis "Stripe" di mana-mana dan hanya memikirkan satu arah pembayaran. Keduanya sudah tidak benar. Empat koreksi yang mengubah rancangan:

**a. Rail fiat sekarang PayPal, bukan Stripe.** Stripe sudah dicabut habis: `lib/stripe.ts`, route Connect, dan dependency-nya dihapus. Alasannya Stripe tidak menerima bisnis Indonesia. Setiap kalimat "jangan rusak Stripe" berarti "jangan rusak PayPal".

**b. Ada dua arah pembayaran, bukan satu.** Ini bagian terpenting dan seluruh Bab 1 membahasnya. Dokumen lama hanya merancang pembayaran invoice (klien → freelancer). Langganan (pengguna → Involoop) punya penerima, kepemilikan dana, konsekuensi kegagalan, dan tanggung jawab hukum yang **berbeda total**.

**c. Pembelian paket saat ini tidak tercatat di mana pun.** `payments.invoice_id` adalah `NOT NULL`, jadi pembelian paket — yang tidak punya invoice — secara struktural tidak bisa masuk tabel itu. Hari ini ketika seseorang membeli Pro lewat PayPal, tidak ada baris pembayaran yang tersimpan: tidak ada nominal, tidak ada ID transaksi, tidak ada jalan rekonsiliasi. Ini lubang yang **sudah ada sekarang**, dan crypto membuatnya berbahaya karena uang on-chain yang tidak tercatat tidak bisa dilacak balik.

**d. Dokumen lama mengarang tabel baru.** Ia mengusulkan `Payment`, `CryptoPayment`, `WalletConnection` dari nol, seolah belum ada apa-apa. Padahal `payments` sudah provider-neutral (`provider`, `provider_session_id`, `provider_payment_id`, `provider_charge_id`) dan `webhook_events` sudah punya `UNIQUE(provider_event_id)`. Membangun model paralel akan membuat dua sumber kebenaran tentang uang. Rancangan baru memperluas yang ada.

---

# 1. DUA ARAH PEMBAYARAN

Ini inti dokumen. Salah memahami bab ini akan menghasilkan sistem yang benar untuk satu arah dan berbahaya untuk arah lain.

## 1.1 Arah A — Klien membayar invoice freelancer

```text
Wallet klien  →  USDC  →  wallet freelancer
                            (Involoop tidak pernah menyentuh dana)
```

## 1.2 Arah B — Pengguna membayar langganan ke Involoop

```text
Wallet pengguna  →  USDC  →  wallet platform Involoop
                               (Involoop ADALAH penerimanya)
```

## 1.3 Perbedaan yang merembet ke mana-mana

| | Arah A · Invoice | Arah B · Langganan |
|---|---|---|
| Penerima | wallet freelancer, di-snapshot per invoice | wallet platform, tetap, dari env |
| Kepemilikan dana | non-custodial, Involoop di luar jalur uang | Involoop memegang dana — custodial secara definisi |
| Sumber nominal | `invoices.amount_minor` | harga paket tetap ($3 / $8) |
| Saat sukses | `invoices.status = paid` | `profiles.plan` diberikan, jendela kuota mulai |
| Kredit referral | **tidak** diberikan (klien belum tentu pengguna) | tidak relevan |
| Kalau verifikasi gagal padahal dana terkirim | masalah antara dua pengguna; Involoop memfasilitasi | **Involoop berutang ke pengguna** |
| Refund | freelancer mengirim transaksi baru dari wallet-nya | Involoop harus refund dari wallet platform |
| Jika wallet penerima berubah | invoice lama tetap ke snapshot lama | tidak ada snapshot; alamat platform dari env |

Baris "kalau verifikasi gagal" adalah alasan kedua arah tidak boleh dibangun sebagai satu jalur seragam. Pada Arah A, uang sudah pindah dari klien ke freelancer dan Involoop hanya gagal mencatatnya — buruk, tapi tidak ada yang kehilangan uang. Pada Arah B, pengguna membayar Involoop dan **tidak menerima apa pun**. Itu kewajiban, bukan bug tampilan.

## 1.4 Konsekuensi rancangan

1. `payments.invoice_id` harus dibuat **nullable**, dan ditambah `purpose` (`invoice` | `plan`) serta `user_id` untuk pembelian paket. Tanpa ini Arah B tidak punya tempat tinggal.
2. Verifikasi on-chain harus tahu **penerima mana** yang diharapkan: snapshot invoice, atau alamat platform. Satu fungsi, dua sumber penerima, tidak pernah dari frontend.
3. Harus ada **antrean operator** untuk pembayaran yang terverifikasi on-chain tapi gagal diberikan paketnya. Konsol admin sudah ada — tab baru "Unmatched payments" adalah tempatnya.
4. Wallet platform adalah **risiko kustodi**. Di devnet tidak masalah. Untuk mainnet, ini keputusan yang harus dicatat di gerbang migrasi, bukan diselundupkan.

## 1.5 Pertanyaan produk yang harus dijawab sebelum membangun Arah B

Paket Involoop berharga **$3 dan $8**. Biaya jaringan Solana memang kecil, tapi friksi bagi pengguna besar: memasang wallet, punya SOL untuk gas, memahami jaringan. Untuk nominal sekecil itu, membayar dengan kartu jauh lebih mudah.

Rekomendasi: **tetap bangun Arah B**, karena ia membuktikan kemampuan dua arah dan itu yang dinilai. Tapi di UI, **PayPal tetap pilihan utama** dan USDC ditawarkan sebagai alternatif, bukan sebaliknya. Jangan memaksa orang membayar $3 dengan crypto.

---

# 2. ATURAN YANG TIDAK BOLEH DILANGGAR

* Jangan merusak alur PayPal yang sudah berjalan.
* Jangan mengubah model pembayaran menjadi khusus crypto.
* PayPal dan Solana memakai abstraksi pembayaran yang sama.
* Semua demo memakai **Solana Devnet**. Jangan pakai mainnet sebelum seluruh gerbang di Bab 15 lulus.
* Jangan menyimpan seed phrase atau private key pengguna. Jangan pernah memintanya.
* Jangan membuat custodial wallet untuk pengguna.
* Jangan menandai invoice PAID atau memberikan paket hanya karena pengguna kembali dari wallet.
* Jangan mempercayai nominal, penerima, token, atau signature yang datang dari frontend.
* Blockchain dan hasil verifikasi server adalah satu-satunya sumber kebenaran.
* Jangan membuat smart contract sendiri. Jangan membuat token Involoop.
* Jangan menambah jaringan lain (Ethereum, Base, Polygon, BNB) pada tahap ini.
* Jangan memasukkan secret ke source code. Jangan commit `.env`.
* Jika environment variable belum ada, tandai **BLOCKED** dan jelaskan apa yang kurang. Jangan mengarang hasil.

---

# 3. TARGET TEKNIS

```text
Network demo      : Solana Devnet
Aset settlement   : USDC Devnet
Protokol          : Solana Pay
Wallet            : Wallet Standard adapter (Phantom, Solflare, Backpack)
Deteksi           : webhook penyedia RPC + reconciliation job
Verifikasi final  : Solana RPC dari sisi server
```

Untuk RPC gunakan **satu** penyedia dan sebutkan mana yang dipakai: Helius atau Alchemy. Keduanya menyediakan webhook. Jangan memakai RPC publik `api.devnet.solana.com` untuk verifikasi — rate limit-nya akan membuat verifikasi gagal secara acak dan itu terlihat seperti bug pembayaran.

Jangan mengikat implementasi ke Phantom saja. Pakai adapter Wallet Standard supaya wallet lain ikut jalan tanpa kode tambahan.

---

# 4. FASE 1 — AUDIT SEBELUM MENYENTUH KODE

Laporkan kondisi awal:

1. Struktur invoice, payment, webhook, referral, credit ledger.
2. Semua route di `app/api/payments/**` dan apa yang dilakukan masing-masing.
3. `publish_invoice`, `update_invoice`, `delete_invoice`, `dashboard_payload` — RPC mana yang menyentuh uang.
4. Bagaimana pembelian paket dilacak hari ini (jawabannya: hampir tidak).
5. Apakah alur PayPal berikut lulus:

```text
Owner membuat invoice
→ klien membuka invoice publik
→ klien membayar lewat PayPal sandbox
→ capture berhasil
→ webhook terverifikasi ulang ke PayPal
→ payment CONFIRMED
→ invoice PAID
→ webhook ganda tidak menggandakan apa pun
```

Kalau alur PayPal masih gagal, laporkan dulu dan jangan lanjut. Crypto boleh ditambahkan hanya kalau kegagalan PayPal tidak berhubungan dengan struktur pembayaran bersama.

---

# 5. FASE 2 — MODEL DATA

Perluas yang sudah ada. Jangan membuat dunia paralel.

## 5.1 Perubahan pada `payments`

```sql
alter table payments alter column invoice_id drop not null;
alter table payments add column if not exists purpose text not null default 'invoice'
  check (purpose in ('invoice','plan'));
alter table payments add column if not exists user_id uuid references profiles(id) on delete set null;

-- Sebuah baris harus jelas membayari apa. Tidak boleh ada baris tanpa tujuan.
alter table payments add constraint payments_target_ck check (
  (purpose = 'invoice' and invoice_id is not null) or
  (purpose = 'plan'    and user_id   is not null)
);
```

Perubahan ini **juga memperbaiki lubang PayPal yang sudah ada**: mulai sekarang pembelian paket lewat PayPal wajib menulis baris `payments` dengan `purpose = 'plan'`. Tanpa itu tidak ada catatan bahwa uang pernah masuk.

## 5.2 Tabel baru khusus data on-chain

```sql
create table crypto_payments (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references payments(id) on delete cascade,
  network text not null,                    -- 'solana-devnet' | 'solana-mainnet'
  token_symbol text not null,               -- 'USDC'
  token_mint text not null,                 -- alamat mint, bukan nama
  token_decimals int not null,
  recipient_wallet text not null,           -- snapshot, dibekukan saat request dibuat
  expected_amount_minor bigint not null,
  payment_reference text not null unique,   -- kunci pencocokan on-chain
  transaction_signature text unique,        -- null sampai terdeteksi
  commitment text,
  status text not null default 'awaiting_payment',
  last_error text,
  attempts int not null default 0,
  detected_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

`UNIQUE(transaction_signature)` adalah pertahanan utama terhadap replay: satu transaksi on-chain tidak akan pernah membayari dua hal.

## 5.3 Wallet freelancer

```sql
alter table profiles add column if not exists solana_wallet text;
alter table profiles add column if not exists solana_wallet_verified_at timestamptz;

create table wallet_nonces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  nonce text not null unique,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
```

## 5.4 Aturan angka

Jangan pernah memakai floating point untuk uang atau token. Gunakan integer minor unit sesuai `token_decimals` (USDC = 6). Konversi dilakukan dengan aritmetika string atau bigint, tidak dengan `Number` — pola yang sama sudah dipakai di `toPaypalAmount`, ikuti itu.

---

# 6. FASE 3 — MENGHUBUNGKAN WALLET FREELANCER (Arah A)

Alur:

1. Freelancer klik **Connect wallet** di halaman profil.
2. Frontend meminta public key dari wallet.
3. Backend membuat nonce acak, tersimpan, punya expiry, sekali pakai.
4. Freelancer menandatangani pesan.
5. Backend memverifikasi signature terhadap public key.
6. Backend menyimpan alamat dan menandainya terverifikasi.

Pesan yang ditandatangani harus jujur tentang apa yang tidak dilakukannya:

```text
Sign this message to connect your Solana wallet to Involoop.

This proves you own this address. It does not authorize any
transaction, transfer, or spending approval.

Wallet:    <address>
Account:   <user id>
Domain:    involoop.vercel.app
Nonce:     <nonce>
Issued at: <iso>
Expires:   <iso, 10 menit>
```

Aturan: nonce sekali pakai, punya expiry, terikat ke domain dan user id. Alamat wallet harus divalidasi sebagai public key Solana yang sah (base58, 32 byte) sebelum disimpan.

UI wajib memuat:

> Involoop tidak akan pernah meminta recovery phrase atau private key kamu.

## 6.1 Mengganti wallet

Mengganti wallet adalah operasi berisiko tinggi — salah alamat berarti uang klien masuk ke orang lain.

1. Butuh sesi yang masih segar.
2. Butuh signature dari wallet **baru**.
3. Tulis ke audit log (`admin_audit` sudah ada polanya; buat setara untuk aksi pengguna).
4. **Invoice yang sudah terbit tidak berubah penerimanya.** Ia memakai `recipient_wallet` yang dibekukan saat request dibuat.
5. Beri tahu di UI bahwa invoice lama tetap mengarah ke wallet lama, dan cara mengubahnya adalah menghapus lalu menerbitkan ulang.

---

# 7. FASE 4 — PERMINTAAN PEMBAYARAN

Satu fungsi, dua sumber penerima. Ini titik di mana kedua arah bertemu dan harus tetap terpisah dengan jelas.

```text
buatPermintaanUSDC({ purpose })

  purpose = 'invoice'
    penerima   = invoices.owner → profiles.solana_wallet (dibekukan ke crypto_payments.recipient_wallet)
    nominal    = invoices.amount_minor
    syarat     = invoice.currency = 'USD' DAN owner punya wallet terverifikasi

  purpose = 'plan'
    penerima   = SOLANA_PLATFORM_WALLET (env, divalidasi saat boot)
    nominal    = harga paket tetap
    syarat     = pengguna sedang login
```

Keduanya:

* Nominal dan penerima **selalu** dari server. Tidak pernah dari frontend.
* Mint USDC diambil dari allowlist per network, bukan dari nama token.
* Setiap permintaan punya `payment_reference` unik. Reference inilah yang dicari on-chain.
* Setiap permintaan punya `expires_at`. Permintaan kedaluwarsa tidak boleh diselesaikan.

Solana Pay URL berisi: `recipient`, `amount`, `spl-token`, `reference`, `label`, `message`.

```text
label   : Involoop · INV20260017
message : Payment for brand website design and development
```

Untuk paket:

```text
label   : Involoop Pro · 30 days
message : Involoop plan purchase
```

## 7.1 Kebijakan mata uang

Involoop menagih dalam 8 mata uang: IDR, MYR, SGD, THB, PHP, USD, EUR, GBP.

Untuk MVP wallet: **USDC hanya untuk invoice berdenominasi USD.**

Jangan membuat konversi diam-diam. Jangan menambah oracle atau FX otomatis. Kalau invoice bukan USD, sembunyikan opsi USDC dan katakan alasannya dalam satu kalimat — pola yang sama sudah dipakai untuk IDR dan MYR di PayPal, ikuti itu.

Untuk paket, harga sudah dalam USD, jadi tidak ada masalah.

---

# 8. FASE 5 — UX UNTUK ORANG YANG BELUM PERNAH PAKAI CRYPTO

Ini bagian yang paling menentukan apakah fitur ini terpakai atau hanya jadi pajangan. Sebagian besar klien yang membuka invoice **tidak punya wallet dan tidak ingin punya**.

## 8.1 Urutan pilihan tidak boleh berubah

```text
[ Pay with PayPal ]        ← utama, tetap paling atas
[ Debit or Credit Card ]
──────── atau ────────
[ Pay with USDC ]          ← alternatif, tidak menonjol
[ Bank transfer ]
```

Crypto **tidak** menjadi default dan tidak diberi warna paling mencolok. Orang yang mencarinya akan menemukannya; orang yang tidak, tidak perlu terganggu.

## 8.2 Kalau opsi USDC tidak muncul, katakan kenapa

Tiga sebab, tiga kalimat berbeda:

* Invoice bukan USD → "Pembayaran USDC baru tersedia untuk invoice dalam USD."
* Freelancer belum menghubungkan wallet → jangan tampilkan apa pun ke klien. Ini urusan freelancer, bukan klien. Tampilkan pengingat di dashboard freelancer.
* Fitur belum dikonfigurasi di server → jangan tampilkan.

## 8.3 Tiga hal yang paling sering membuat orang bingung

**a. "Saya sudah kirim tapi statusnya belum berubah."** Konfirmasi on-chain butuh beberapa detik. Tampilkan progres yang jujur, bukan spinner tanpa keterangan:

```text
Menunggu pembayaran   → belum ada transaksi masuk
Transaksi terdeteksi   → sudah masuk, sedang dikonfirmasi jaringan
Pembayaran dikonfirmasi → selesai
```

**b. "Kenapa saya butuh SOL padahal bayarnya USDC?"** Ini penyebab kegagalan nomor satu bagi pemula. Katakan di depan, sebelum mereka mencoba:

> Kamu butuh USDC untuk nominalnya, plus sedikit SOL untuk biaya jaringan. Keduanya di jaringan Devnet.

Sertakan tautan faucet Devnet.

**c. Salah jaringan.** Mengirim USDC mainnet ke alamat devnet, atau sebaliknya, adalah cara paling umum kehilangan uang dan **tidak bisa dibatalkan oleh siapa pun**. Tampilkan jaringan secara mencolok di dekat tombol bayar, bukan di catatan kaki:

> **Solana Devnet** · pembayaran uji, tidak ada uang sungguhan yang berpindah.

## 8.4 Yang wajib tampil di panel USDC

Nominal persis, token USDC, jaringan, alamat penerima yang disingkat dengan tombol salin, QR code, tombol buka di wallet, status berjalan, dan peringatan bahwa mengirim nominal berbeda tidak akan menyelesaikan invoice.

Jangan pernah menampilkan atau meminta seed phrase, private key, atau file keypair.

---

# 9. FASE 6 — DETEKSI DAN WEBHOOK

Ada dua webhook di sistem ini sekarang, dan keduanya harus dibedakan dengan jelas:

```text
POST /api/payments/webhook          ← PayPal, sudah ada
POST /api/payments/webhook/solana   ← baru
```

Endpoint Solana harus:

1. Memverifikasi authorization secret dengan perbandingan constant-time.
2. Membatasi ukuran payload.
3. Memvalidasi bentuk request.
4. Mencatat event ke `webhook_events` dengan `provider = 'solana'`, memakai `UNIQUE(provider_event_id)` yang sudah ada agar replay tidak menggandakan apa pun.
5. **Tidak mengubah status apa pun langsung.** Ia hanya memanggil verifikasi.

Pelajaran mahal dari integrasi PayPal, jangan diulang: **isi webhook adalah petunjuk, bukan bukti.** Endpoint PayPal sempat menerima event palsu karena sandbox PayPal meloloskan tanda tangan apa pun. Perbaikannya adalah membaca ulang keadaan dari sumbernya. Untuk Solana ini bahkan lebih mudah — rantai adalah sumbernya, dan siapa pun boleh membacanya. Jadi: ambil signature dari webhook, lalu **selalu** verifikasi lewat RPC.

Kalau webhook tidak tersedia, reconciliation job (Bab 12) tetap harus menemukan pembayaran. Sistem harus benar walaupun webhook tidak pernah datang sama sekali.

---

# 10. FASE 7 — VERIFIKASI SERVER-SIDE

Setelah mendapat signature, ambil transaksi dari RPC dan periksa **semua** ini. Satu saja gagal, tolak:

```text
 1. Transaksi ditemukan
 2. Transaksi tidak error
 3. Network sesuai yang diharapkan
 4. Commitment memenuhi kebijakan (Bab 11)
 5. Mint token sama persis dengan USDC resmi network itu
 6. Decimals benar
 7. Penerima sama dengan recipient_wallet yang dibekukan
 8. Nominal sama dengan expected_amount_minor
 9. Reference cocok dengan payment_reference
10. Signature belum pernah dipakai (unique constraint)
11. Transaksi terjadi setelah permintaan dibuat
12. Permintaan belum kedaluwarsa
13. Target belum terbayar (invoice belum PAID / paket belum diberikan)
```

Tidak cukup: ada signature, ada token bernama "USDC", ada transfer ke suatu wallet, klien kembali ke halaman sukses, klien mengirim screenshot.

Periksa perubahan saldo token atau parsed transfer instruction dengan benar. **Jangan percaya nama dan simbol token** — siapa pun bisa membuat token bernama USDC. Yang mengikat hanya alamat mint.

## 10.1 Nominal kurang atau lebih

* Kurang → tolak. Jangan menandai lunas sebagian. Katakan ke klien nominal yang benar.
* Lebih → terima sebagai lunas, catat kelebihannya, dan tampilkan ke kedua pihak. Jangan diam-diam menyimpannya.

---

# 11. FASE 8 — KEBIJAKAN COMMITMENT

```text
awaiting_payment → detected → verifying → confirmed
                                        ↘ failed
                                        ↘ expired
```

Kebijakan:

```text
Transaksi confirmed  → UI menampilkan "Transaksi terdeteksi"
Transaksi finalized  → payment CONFIRMED, invoice PAID / paket diberikan
```

Jangan menandai lunas pada status `processed`. Untuk demo, tampilkan progres agar tidak terlihat macet.

---

# 12. FASE 9 — PENULISAN DATABASE

Satu transaksi database, tidak boleh setengah jalan.

**Arah A — invoice:**

```text
crypto_payments.status = confirmed, signature, confirmed_at
payments.status = succeeded, paid_at
invoices.status = paid, paid_at
```

**Arah B — paket:**

```text
crypto_payments.status = confirmed, signature, confirmed_at
payments.status = succeeded, paid_at        (purpose = 'plan', user_id terisi)
profiles.plan, plan_started_at, plan_expires_at
```

Untuk Arah B, kalau penulisan paket gagal padahal uang sudah masuk, **jangan menelan errornya**. Tandai baris untuk ditinjau operator dan munculkan di konsol admin. Uang sudah ada di wallet platform; pengguna berhak atas paketnya.

Pastikan:

* Constraint unik signature aktif.
* Invoice tidak bisa dibayar dua kali.
* Webhook bersamaan tidak menggandakan update.
* Kredit referral **tidak** diproses oleh handler pembayaran.

---

# 13. FASE 10 — PEMBAYARAN DAN REFERRAL TETAP TERPISAH

```text
Pembayaran berhasil     : transaksi terverifikasi → invoice PAID
Referral berhasil       : klien klik CTA → daftar → kredit diberikan
```

Jangan memberikan kredit referral hanya karena sebuah wallet mengirim uang. Klien yang membayar belum tentu menjadi pengguna Involoop. Aturan ini sudah berlaku untuk PayPal; jangan dilanggar untuk crypto.

---

# 14. FASE 11 — RECONCILIATION JOB

Webhook bisa terlewat. Sistem harus tetap benar tanpanya.

```text
Setiap 1–5 menit:
  ambil crypto_payments berstatus awaiting_payment / detected / verifying
  cari transaksi berdasarkan reference lewat RPC
  jalankan verifikasi yang sama persis (Bab 10)
  perbarui status
  tandai expired yang melewati expires_at
```

Job harus idempotent, punya batas percobaan dan backoff, menyimpan `last_error`, dan tidak membanjiri RPC.

**Tambahan untuk Arah B:** cari juga pembayaran paket yang `succeeded` tapi paketnya belum diberikan. Itu antrean utang, dan harus terlihat di konsol admin.

---

# 15. FASE 12 — REFUND

Tidak ada refund otomatis di MVP. Keduanya berbeda:

**Arah A** — dana ada di wallet freelancer. Involoop tidak bisa dan tidak boleh menariknya. Refund dilakukan freelancer sebagai transaksi baru. Kalau signature refund diberikan, verifikasi pengirim, penerima, dan nominalnya, lalu simpan sebagai transaksi terpisah. **Jangan menghapus pembayaran aslinya** — tampilkan keduanya.

**Arah B** — dana ada di wallet platform. Ini kewajiban Involoop. Sediakan aksi di konsol admin untuk menandai refund dan mencatat signature-nya. Untuk devnet cukup pencatatan; untuk mainnet ini butuh prosedur dan orang yang bertanggung jawab.

---

# 16. FASE 13 — KONTROL KEAMANAN

* Rate limit dan authorization secret pada webhook, dibandingkan constant-time.
* Verifikasi RPC untuk setiap klaim pembayaran.
* Unique constraint pada signature dan event id.
* Nonce sekali pakai dengan expiry untuk wallet signature.
* Validasi input di semua route yang mengubah keadaan.
* Allowlist mint USDC dan allowlist network.
* Validasi timestamp transaksi.
* Snapshot penerima, tidak pernah dibaca ulang dari profil saat verifikasi.
* Nominal selalu dari server.
* Audit log untuk perubahan wallet.

Jangan pernah menulis ke log: seed phrase, private key, kredensial penuh, webhook secret, API key RPC, atau session token.

**Satu pelajaran dari audit RLS minggu ini:** policy Postgres tidak bisa membatasi kolom. Kalau menambah kolom wallet ke `profiles`, pastikan tidak ada policy `for update` yang memungkinkan pengguna menulis kolom itu sendiri — karena mengubah `solana_wallet` sendiri berarti membelokkan uang klien orang lain. Saat ini `profiles` sudah read-only bagi browser (migrasi p8); jangan dilonggarkan.

---

# 17. FASE 14 — PENGUJIAN

## Unit

Validasi alamat wallet · verifikasi signature · expiry nonce · penolakan nonce ulang · pembuatan reference · validasi mint · konversi nominal · parsing transaksi · validasi penerima · validasi reference · keunikan signature · transisi status · otorisasi webhook · idempotensi webhook · idempotensi reconciliation.

## Kasus tepi wajib

Dua kolom, karena keduanya harus diuji terpisah:

**Umum**
1. Signature palsu
2. Transaksi tidak ditemukan
3. Transaksi gagal
4. Belum finalized
5. Token palsu bernama USDC
6. Mint salah
7. Nominal kurang
8. Nominal lebih
9. Penerima salah
10. Reference salah
11. Transaksi lebih tua dari permintaan
12. Signature dipakai ulang di target lain
13. Webhook otorisasi salah
14. Webhook dikirim dua kali
15. RPC timeout
16. Webhook terlewat, reconciliation yang menemukan
17. Permintaan kedaluwarsa dibayar

**Arah A · invoice**
18. Freelancer belum punya wallet
19. Signature wallet tidak valid
20. Nonce dipakai ulang / kedaluwarsa
21. Invoice non-USD mencoba USDC
22. Invoice sudah PAID dibayar lagi
23. Invoice dihapus setelah permintaan dibuat
24. Freelancer ganti wallet setelah invoice terbit → invoice lama tetap ke wallet lama
25. Klien membuka URL pembayaran berulang kali

**Arah B · paket**
26. Pengguna belum login
27. Paket dibayar dua kali
28. Pembayaran masuk tapi pemberian paket gagal → muncul di antrean operator
29. Paket sudah aktif lalu dibayar lagi → perpanjang, jangan hangus
30. Wallet platform belum dikonfigurasi → opsi tidak muncul, bukan error

**Regresi**
31. PayPal invoice tetap bekerja
32. PayPal paket tetap bekerja
33. Kredit referral tidak diberikan dua kali
34. Reset demo tidak menyentuh data non-demo

---

# 18. FASE 15 — DEMO

```text
Owner  : demo-owner@involoop.app
Client : demo-client@involoop.app
Sandi  : involoop-demo-2026
```

Pakai wallet Devnet khusus demo. Jangan memakai wallet pribadi. Jangan menyimpan private key demo di repository — tanda tangani lewat browser wallet.

Alur demo maksimal lima menit, **tunjukkan kedua arah**:

```text
Arah A
1. Owner connect wallet, tanda tangani pesan kepemilikan
2. Buat invoice USD 5, aktifkan USDC
3. Klien buka invoice tanpa login, pilih Pay with USDC
4. Bayar dari wallet Devnet
5. Status: terdeteksi → dikonfirmasi
6. Invoice PAID, tautan explorer muncul

Arah B
7. Klien klik CTA referral, daftar
8. Sebagai pengguna baru, beli paket Pro dengan USDC
9. Paket aktif, kuota muncul di dashboard
10. Konsol admin menampilkan kedua pembayaran
```

---

# 19. ENVIRONMENT

```text
SOLANA_NETWORK=
SOLANA_RPC_URL=
SOLANA_USDC_MINT=
SOLANA_PLATFORM_WALLET=
SOLANA_WEBHOOK_SECRET=
NEXT_PUBLIC_SOLANA_NETWORK=
NEXT_PUBLIC_SOLANA_RPC_URL=
```

`SOLANA_PLATFORM_WALLET` hanya untuk Arah B. Validasi sebagai public key yang sah saat aplikasi boot; kalau tidak valid, matikan Arah B dan katakan di log — jangan biarkan orang membayar ke alamat yang salah.

Jangan menampilkan nilai sebenarnya di output mana pun.

---

# 20. GERBANG MAINNET

Jangan aktifkan mainnet sebelum semuanya terpenuhi:

* Seluruh automated test lulus.
* E2E Devnet lulus berulang untuk **kedua** arah.
* Mint USDC mainnet diverifikasi terhadap sumber resmi.
* RPC produksi berbayar tersedia.
* Keamanan webhook diaudit.
* **Kustodi wallet platform diputuskan secara eksplisit**: siapa memegang kunci, di mana, siapa yang bisa memindahkan dana, dan apa yang terjadi kalau orang itu tidak ada. Ini keputusan Arah B dan tidak boleh dilewati.
* Prosedur refund untuk kedua arah tertulis.
* Disclaimer crypto ada di Terms.
* Monitoring dan alerting aktif.
* Review legal — menerima crypto sebagai pembayaran punya konsekuensi regulasi yang berbeda per yurisdiksi.

---

# 21. LAPORAN YANG WAJIB DIBERIKAN

**A. Ringkasan** — untuk kedua arah terpisah: wallet terhubung? permintaan terbuat? transaksi terdeteksi? terverifikasi server-side? invoice PAID / paket diberikan? PayPal masih bekerja? referral masih terpisah?

**B. Arsitektur**

```text
Arah A: wallet klien → Solana → wallet freelancer → webhook → verifikasi RPC → database
Arah B: wallet pengguna → Solana → wallet platform → webhook → verifikasi RPC → database → paket
```

**C. File yang berubah** — nama, tujuan, dampak.

**D. Perubahan database** — migrasi, constraint, index, perubahan status.

**E. Hasil test** — perintah yang dijalankan, lulus, gagal, blocked.

**F. Hasil keamanan** — penanganan private key, replay nonce, otorisasi webhook, verifikasi RPC, penolakan USDC palsu, penolakan nominal kurang, penolakan signature ganda.

**G. Langkah demo** — maksimal lima menit, kedua arah.

**H. Risiko tersisa** — keterbatasan devnet, ketergantungan RPC, phishing wallet, keterbatasan refund, risiko salah jaringan, keterbatasan off-ramp, kustodi wallet platform, pertimbangan regulasi.

Jangan menyatakan berhasil sebelum test benar-benar dijalankan. Kalau ada yang blocked, sebutkan persis apa yang kurang dan jangan mengarang hasil.

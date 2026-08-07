Kamu bertindak sebagai Senior Blockchain Payment Engineer, Solana Engineer, Backend Engineer, dan QA Engineer.

Tugasmu adalah menambahkan pembayaran invoice menggunakan USDC di jaringan Solana ke project Involoop tanpa merusak alur pembayaran Stripe yang sudah ada.

Jangan langsung mengubah kode sebelum melakukan audit terhadap implementasi Stripe, invoice, payment, referral, credit ledger, dan database yang sudah tersedia.

# KONTEKS PRODUK

Involoop adalah SaaS invoice untuk freelancer, consultant, dan micro-agency global.

Saat ini Involoop memiliki atau sedang menyelesaikan pembayaran melalui Stripe.

Tambahkan opsi pembayaran kedua:

* Stripe untuk pembayaran fiat.
* USDC on Solana untuk pembayaran crypto.
* Manual bank transfer sebagai fallback.

Pembayaran crypto harus bersifat non-custodial:

```text
Wallet client
→ langsung mengirim USDC
→ wallet owner invoice
```

Involoop tidak boleh:

* Menahan crypto.
* Menjadi perantara dana.
* Menyimpan private key.
* Meminta seed phrase.
* Memiliki akses untuk memindahkan dana owner.
* Membuat custodial wallet.
* Mengubah transaksi crypto tanpa tanda tangan pengguna.

Involoop hanya bertugas:

1. Menyimpan alamat wallet owner yang telah diverifikasi.
2. Membuat payment request yang unik untuk setiap invoice.
3. Mendeteksi pembayaran on-chain.
4. Memverifikasi transaksi melalui Solana RPC.
5. Mengubah status payment dan invoice.
6. Menampilkan bukti transaksi.
7. Melanjutkan distribution dan referral loop.

# TARGET IMPLEMENTASI

Gunakan:

```text
Network demo: Solana Devnet
Settlement asset: USDC Devnet
Payment protocol: Solana Pay
Wallet awal: Phantom dan wallet Solana-compatible
Detection: Helius webhook atau RPC subscription
Verification: Solana RPC server-side
```

Jangan membuat smart contract sendiri.

Jangan membuat token Involoop.

Jangan menambahkan jaringan lain seperti Ethereum, Base, Polygon, atau BNB Chain pada tahap ini.

# ATURAN PENTING

* Jangan merusak alur Stripe yang sudah ada.
* Jangan mengubah model payment menjadi khusus crypto.
* Stripe dan Solana harus memakai abstraction payment yang sama.
* Semua transaksi demo memakai Solana Devnet.
* Jangan menggunakan uang atau USDC nyata.
* Jangan menggunakan Solana Mainnet sebelum seluruh test Devnet lulus.
* Jangan memasukkan secret ke source code.
* Jangan commit `.env`.
* Jangan menampilkan private environment variable di output.
* Jangan meminta atau menyimpan seed phrase maupun private key.
* Jangan menandai invoice PAID hanya karena client kembali dari wallet.
* Jangan mempercayai data nominal, recipient, token, atau signature dari frontend.
* Blockchain dan hasil verifikasi server adalah sumber kebenaran.
* Jika environment variable belum tersedia, tandai BLOCKED dan jelaskan apa yang dibutuhkan tanpa mengarang hasil.

# FASE 0 — VALIDASI STRIPE SEBELUM MEMULAI

Sebelum menambahkan crypto payment, pastikan alur Stripe berikut sudah lulus:

```text
Owner membuat invoice
→ client membuka public invoice
→ client membayar melalui Stripe test mode
→ webhook terverifikasi
→ payment menjadi CONFIRMED
→ invoice menjadi PAID
→ duplicate webhook tidak menggandakan data
```

Jalankan test yang sudah tersedia.

Jika alur Stripe masih gagal, jangan melanjutkan integrasi wallet.

Laporkan blocker Stripe terlebih dahulu.

Crypto payment baru boleh ditambahkan jika Stripe sudah stabil atau kegagalannya tidak berhubungan dengan struktur payment bersama.

# FASE 1 — AUDIT PROJECT

Deteksi dan laporkan:

1. Framework frontend.
2. Framework backend.
3. ORM.
4. Database.
5. Testing framework.
6. Struktur authentication.
7. Struktur invoice.
8. Struktur payment.
9. Struktur Stripe integration.
10. Struktur webhook.
11. Struktur referral.
12. Struktur credit ledger.
13. Struktur event timeline.
14. Existing payment state machine.
15. Existing API route dan service layer.

Cari semua file yang berhubungan dengan:

```text
invoice
payment
stripe
checkout
webhook
wallet
solana
crypto
referral
credit ledger
timeline
public invoice
demo account
```

Buat ringkasan kondisi awal sebelum mengubah kode.

# FASE 2 — UNIFIED PAYMENT MODEL

Jangan membuat sistem payment terpisah yang tidak berhubungan dengan Stripe.

Gunakan model abstraksi yang mendukung berbagai payment rail.

Struktur minimum:

```text
Payment
- id
- invoice_id
- method
- provider
- status
- amount_minor
- currency
- settlement_asset
- network
- provider_reference
- payer_reference
- paid_at
- failed_at
- expired_at
- refunded_at
- created_at
- updated_at
```

Contoh Stripe:

```text
method: FIAT
provider: STRIPE
currency: USD
settlement_asset: null
network: null
```

Contoh Solana:

```text
method: STABLECOIN
provider: SOLANA_PAY
currency: USD
settlement_asset: USDC
network: SOLANA_DEVNET
```

Tambahkan data khusus crypto pada tabel terpisah jika lebih aman:

```text
CryptoPayment
- id
- payment_id
- invoice_id
- network
- token_symbol
- token_mint
- token_decimals
- recipient_wallet_snapshot
- expected_amount_minor
- payment_reference
- transaction_signature
- commitment
- status
- detected_at
- confirmed_at
- finalized_at
- created_at
- updated_at
```

Tambahkan unique constraint:

```text
UNIQUE(payment_reference)
UNIQUE(transaction_signature)
UNIQUE(payment_id)
```

Jangan gunakan floating point untuk jumlah uang atau token.

Gunakan integer minor units berdasarkan token decimals.

# FASE 3 — WALLET CONNECTION OWNER

Tambahkan menu:

```text
Payment Settings
→ Crypto Wallet
```

Flow:

1. Owner klik Connect Wallet.
2. Frontend meminta public key wallet.
3. Backend membuat nonce acak dan memiliki expiry.
4. Owner menandatangani pesan menggunakan wallet.
5. Backend memverifikasi signature.
6. Backend menyimpan public wallet address.
7. Backend menandai wallet sebagai verified.
8. Nonce tidak boleh digunakan ulang.

Pesan signature harus menjelaskan:

```text
Sign this message to connect your Solana wallet to Involoop.
This request does not authorize any transaction or transfer.
Nonce: ...
Domain: ...
Issued at: ...
Expires at: ...
```

Simpan:

```text
WalletConnection
- id
- user_id
- network
- wallet_address
- verification_status
- verified_at
- last_changed_at
- created_at
- updated_at
```

Aturan keamanan:

* Jangan pernah meminta seed phrase.
* Jangan pernah meminta private key.
* Jangan pernah meminta file keypair.
* Signature hanya membuktikan kepemilikan public address.
* Nonce harus single-use.
* Nonce harus memiliki expiration.
* Domain dan user ID harus terikat ke challenge.
* Wallet address harus divalidasi sebagai public key Solana yang valid.

Tambahkan UI notice:

> Involoop will never ask for your recovery phrase or private key.

# FASE 4 — PERUBAHAN WALLET OWNER

Perubahan wallet adalah operasi berisiko tinggi.

Implementasikan:

1. Re-authentication menggunakan password atau session fresh.
2. Signature dari wallet baru.
3. Notifikasi email.
4. Audit log.
5. Optional cooldown.
6. Invoice lama tidak otomatis berubah recipient.

Saat invoice dipublikasikan, simpan:

```text
recipient_wallet_snapshot
```

Jika owner mengganti wallet pada profil:

* Invoice lama tetap memakai wallet snapshot lama.
* Invoice baru memakai wallet baru.
* Owner dapat membatalkan dan menerbitkan ulang invoice lama jika ingin mengganti recipient.
* Jangan mengubah payment request invoice yang sudah dipublikasikan tanpa peringatan eksplisit.

# FASE 5 — CREATE CRYPTO PAYMENT REQUEST

Pada create atau publish invoice, tambahkan opsi:

```text
Payment methods

[ ] Stripe
[ ] USDC on Solana
[ ] Manual transfer
```

Opsi USDC hanya aktif jika owner mempunyai verified wallet.

Saat owner mengaktifkan USDC:

1. Ambil invoice amount dari database.
2. Ambil recipient dari wallet snapshot.
3. Gunakan USDC mint resmi sesuai Devnet.
4. Buat unique payment reference.
5. Buat Solana Pay transfer request.
6. Simpan payment dan crypto payment record.
7. Buat QR code dan payment URL.
8. Jangan mengambil nominal atau recipient dari frontend.

Payment request harus mempunyai:

```text
recipient
amount
spl-token
reference
label
message
memo jika diperlukan
```

Contoh label:

```text
Involoop Invoice INV-2026-001
```

Contoh message:

```text
Payment for landing page development
```

Setiap invoice harus mempunyai reference unik.

# FASE 6 — CURRENCY DAN USDC SETTLEMENT

Invoice dapat menggunakan currency:

```text
USD
EUR
GBP
SGD
IDR
```

Untuk versi MVP wallet:

* Payment crypto hanya menerima USDC.
* Jika invoice currency USD, gunakan nilai invoice langsung.
* Jika invoice currency selain USD, jangan membuat konversi secara diam-diam.

Gunakan salah satu kebijakan eksplisit:

Kebijakan yang disarankan untuk MVP:

```text
USDC payment only available for USD-denominated invoices.
```

Jika invoice bukan USD:

* Nonaktifkan pilihan USDC.
* Tampilkan pesan bahwa crypto payment hanya tersedia untuk invoice USD pada versi awal.

Jangan menambahkan oracle atau automatic FX conversion pada tahap ini.

# FASE 7 — PUBLIC INVOICE UX

Tambahkan bagian:

## Pay this invoice

### Card or bank

```text
Pay securely with Stripe
```

### USDC

```text
Pay {amount} USDC on Solana
For clients who already use crypto.
```

### Manual transfer

```text
View bank transfer instructions
```

Pada pilihan USDC tampilkan:

* Amount.
* Token: USDC.
* Network: Solana Devnet.
* Recipient wallet disingkat.
* QR code.
* Open in wallet button.
* Copy payment link.
* Waiting for payment status.
* Test mode notice.

Notice:

> Solana Devnet test payment. No real money will be transferred.

Tambahkan:

> You need test USDC and a small amount of Devnet SOL for network fees.

Jangan menampilkan seed phrase, private key, atau instruksi yang meminta data sensitif wallet.

# FASE 8 — CRYPTO PAYMENT DETECTION

Gunakan Helius webhook sebagai notifikasi cepat jika credential tersedia.

Endpoint contoh:

```text
POST /api/webhooks/solana
```

Endpoint harus:

1. Memverifikasi authorization secret.
2. Membatasi ukuran payload.
3. Memvalidasi schema request.
4. Mengambil transaction signature.
5. Menyimpan webhook event.
6. Menolak atau mengabaikan event duplikat.
7. Tidak langsung mengubah invoice menjadi PAID.
8. Menjalankan verification service.

Jika Helius tidak tersedia, gunakan:

* RPC WebSocket subscription.
* Polling reconciliation job.
* Manual check transaction endpoint untuk demo.

Namun verifikasi final tetap harus memakai Solana RPC.

# FASE 9 — SERVER-SIDE TRANSACTION VERIFICATION

Setelah mendapat transaction signature, backend harus mengambil transaksi melalui Solana RPC dan memverifikasi seluruh data berikut:

```text
1. Transaction ditemukan
2. Transaction tidak gagal
3. Network sesuai
4. Commitment sesuai kebijakan
5. Token mint sama dengan USDC resmi
6. Token decimals benar
7. Recipient sama dengan wallet snapshot invoice
8. Amount sama dengan expected amount
9. Reference sama dengan payment reference invoice
10. Signature belum pernah digunakan
11. Transaksi terjadi setelah invoice dipublikasikan
12. Invoice belum PAID
13. Payment belum expired
```

Jangan hanya memeriksa:

* Ada transaction signature.
* Ada token bernama USDC.
* Ada transfer ke suatu wallet.
* Client kembali ke success page.
* Client mengirim screenshot.

Periksa token balance changes atau parsed token transfer dengan benar.

Jangan mempercayai nama dan simbol token.

Gunakan mint address resmi sesuai network.

# FASE 10 — COMMITMENT POLICY

Gunakan state:

```text
AWAITING_PAYMENT
DETECTED
VERIFYING
CONFIRMED
FINALIZED
FAILED
EXPIRED
REFUNDED
```

Kebijakan yang disarankan:

```text
Transaction confirmed:
UI menampilkan Payment detected.

Transaction finalized:
Payment menjadi CONFIRMED.
Invoice menjadi PAID.
```

Untuk demo, berikan progress state yang jelas agar pengguna tidak mengira proses macet.

Jangan menandai invoice PAID hanya pada status processed.

# FASE 11 — DATABASE TRANSACTION

Setelah transaksi on-chain valid dan finalized, jalankan satu database transaction:

```text
CryptoPayment.status = CONFIRMED
CryptoPayment.transaction_signature = signature
CryptoPayment.confirmed_at = now
Payment.status = CONFIRMED
Payment.paid_at = now
Invoice.status = PAID
Timeline event = CRYPTO_PAYMENT_CONFIRMED
```

Pastikan:

* Unique signature constraint aktif.
* Invoice tidak dapat dibayar dua kali.
* Concurrent webhook tidak menggandakan update.
* Concurrent RPC verification tidak menggandakan timeline.
* Referral credit tidak diproses oleh payment handler.

# FASE 12 — PAYMENT DAN REFERRAL HARUS TERPISAH

Payment berhasil:

```text
Crypto transaction verified
→ Payment CONFIRMED
→ Invoice PAID
```

Referral berhasil:

```text
Client klik CTA
→ client signup/login
→ referral tervalidasi
→ owner dan client menerima credit
```

Jangan memberikan referral reward hanya karena wallet melakukan pembayaran.

Client yang membayar belum tentu menjadi pengguna Involoop.

# FASE 13 — RECONCILIATION JOB

Webhook atau WebSocket dapat terlewat.

Tambahkan scheduled job:

```text
Setiap 1–5 menit:
- Cari crypto payment AWAITING_PAYMENT, DETECTED, atau VERIFYING
- Cari transaction berdasarkan reference
- Ambil transaksi dari RPC
- Jalankan verification
- Perbarui status
```

Job harus:

* Idempotent.
* Mempunyai retry limit.
* Mempunyai backoff.
* Tidak membebani RPC berlebihan.
* Menandai payment expired sesuai aturan.
* Menyimpan error terakhir.

# FASE 14 — PAYMENT SUCCESS UI

Setelah final verification:

```text
Payment confirmed

500.00 USDC
Solana Devnet
Invoice INV-2026-001
Transaction 4Fk...P9x
Confirmed at ...
```

Tambahkan:

```text
View on Solana Explorer
```

Explorer URL harus sesuai network.

Setelah payment confirmation tampilkan CTA:

```text
Create an invoice like this
Get free publishing credits
```

Success page hanya membaca status database.

Success page tidak boleh mengubah payment atau invoice.

# FASE 15 — REFUND MODEL

Jangan membuat refund otomatis pada MVP.

Karena dana langsung masuk ke wallet owner:

```text
Client wallet → owner wallet
```

Refund dilakukan oleh owner sebagai transaksi baru.

Tambahkan status atau pencatatan:

```text
REFUND_REQUESTED
REFUNDED_EXTERNALLY
```

Jika refund signature diberikan:

* Verifikasi transaksi refund.
* Pastikan sender adalah wallet owner.
* Pastikan recipient adalah wallet client jika data tersedia.
* Pastikan amount sesuai.
* Simpan refund signature.
* Jangan menghapus payment awal.
* Tampilkan payment dan refund sebagai dua transaksi berbeda.

# FASE 16 — SECURITY CONTROLS

Implementasikan:

* Rate limiting pada webhook.
* Authorization secret untuk webhook.
* RPC verification.
* Unique event/signature constraints.
* Nonce untuk wallet signature.
* Nonce expiration.
* Replay protection.
* CSRF protection pada state-changing routes.
* Input validation.
* Audit log.
* Wallet change notification.
* Recipient snapshot.
* Server-side amount validation.
* Official USDC mint allowlist.
* Supported network allowlist.
* Transaction timestamp validation.
* Constant-time secret comparison bila relevan.
* Logging tanpa membocorkan secret.

Jangan log:

* Seed phrase.
* Private key.
* Full credential.
* Webhook secret.
* RPC API key.
* Session token.

# FASE 17 — EDGE CASE TESTING

Uji minimal:

1. Owner belum connect wallet.
2. Wallet address tidak valid.
3. Wallet signature tidak valid.
4. Nonce digunakan ulang.
5. Nonce expired.
6. Invoice non-USD mencoba mengaktifkan USDC.
7. Invoice amount nol.
8. Invoice amount negatif.
9. Invoice draft dibayar.
10. Invoice expired dibayar.
11. Invoice sudah PAID dibayar lagi.
12. Transaction signature palsu.
13. Transaction tidak ditemukan.
14. Transaction gagal.
15. Transaction belum finalized.
16. Token palsu bernama USDC.
17. USDC mint salah.
18. Amount kurang.
19. Amount lebih.
20. Recipient salah.
21. Reference salah.
22. Transaction lama.
23. Signature digunakan pada invoice lain.
24. Webhook authorization salah.
25. Webhook dikirim dua kali.
26. RPC timeout.
27. Helius webhook terlewat.
28. Reconciliation menemukan payment.
29. Owner mengganti wallet setelah invoice published.
30. Client refresh success page.
31. Client membuka payment URL berulang.
32. Stripe tetap bekerja setelah perubahan.
33. Referral credit tidak diberikan dua kali.
34. Demo reset tidak mengubah user production.

# FASE 18 — AUTOMATED TESTS

Tambahkan unit test untuk:

* Wallet address validation.
* Signature verification.
* Nonce expiration.
* Nonce replay prevention.
* Payment reference generation.
* USDC mint validation.
* Amount conversion.
* Transaction parsing.
* Recipient validation.
* Reference validation.
* Signature uniqueness.
* State transition.
* Webhook authorization.
* Webhook idempotency.
* Reconciliation idempotency.

Tambahkan integration test untuk:

* Connect wallet.
* Publish USD invoice with USDC.
* Generate Solana Pay request.
* Detect transaction.
* Verify transaction.
* Mark invoice PAID.
* Show explorer link.
* Keep referral separate.
* Stripe payment regression.

Tambahkan end-to-end test menggunakan browser automation jika stack mendukung.

# FASE 19 — DEMO ACCOUNT

Gunakan akun:

```text
Owner:
demo-owner@involoop.app

Client:
demo-client@involoop.app

Password:
involoop-demo-2026
```

Tambahkan demo wallet Devnet yang aman.

Jangan menggunakan wallet pribadi.

Jangan menyimpan private key demo di repository.

Gunakan browser wallet untuk menandatangani transaksi demo.

Tambahkan reset demo yang hanya menghapus:

* Demo crypto payments.
* Demo invoices.
* Demo referral events.
* Demo analytics.
* Demo credit ledger.

Jangan menghapus data non-demo.

# FASE 20 — DEMO FLOW

Siapkan demo maksimal lima menit:

## Owner

1. Login.
2. Buka Payment Settings.
3. Connect Solana wallet.
4. Tandatangani ownership message.
5. Buat invoice USD 5.
6. Aktifkan Stripe dan USDC.
7. Publish.
8. Salin public link.

## Client

1. Buka invoice tanpa login.
2. Lihat Stripe dan USDC option.
3. Pilih Pay with USDC.
4. Scan QR atau buka wallet.
5. Konfirmasi transaksi Devnet.
6. Lihat status Payment detected.
7. Tunggu status Payment confirmed.
8. Lihat explorer transaction.
9. Klik referral CTA.
10. Login sebagai demo client.

## Owner kembali

1. Invoice PAID.
2. Payment method USDC.
3. Signature tersimpan.
4. Event timeline lengkap.
5. Referral conversion muncul.
6. Owner mendapat credit.
7. Client mendapat bonus credit.

# FASE 21 — README

Tambahkan dokumentasi:

1. Crypto payment overview.
2. Non-custodial architecture.
3. Wallet connection.
4. Solana Pay request.
5. USDC Devnet configuration.
6. Helius webhook configuration.
7. RPC configuration.
8. Environment variables.
9. Security guarantees.
10. Known limitations.
11. Demo instructions.
12. Mainnet migration checklist.

Environment variable contoh tanpa nilai:

```text
SOLANA_NETWORK=
SOLANA_RPC_URL=
SOLANA_USDC_MINT=
HELIUS_API_KEY=
HELIUS_WEBHOOK_SECRET=
NEXT_PUBLIC_SOLANA_NETWORK=
```

Jangan menampilkan nilai sebenarnya.

# MAINNET MIGRATION GATE

Jangan mengaktifkan Solana Mainnet sebelum:

* Semua automated test lulus.
* Devnet E2E lulus berulang.
* USDC mainnet mint diverifikasi.
* Production RPC tersedia.
* Webhook security diaudit.
* Terms dan crypto payment disclaimer tersedia.
* Refund policy tersedia.
* Wallet change security tersedia.
* Legal review dilakukan.
* Monitoring dan alerting tersedia.

# OUTPUT YANG WAJIB DIBERIKAN

Setelah selesai, berikan laporan:

## A. Executive Summary

* Apakah wallet connection bekerja?
* Apakah Solana Pay request bekerja?
* Apakah transaksi USDC terdeteksi?
* Apakah transaksi diverifikasi server-side?
* Apakah invoice menjadi PAID?
* Apakah Stripe tetap bekerja?
* Apakah referral loop tetap bekerja?

## B. Architecture

Tampilkan alur:

```text
Client wallet
→ Solana
→ Owner wallet
→ Helius notification
→ RPC verification
→ Involoop database
```

## C. Files Changed

* Nama file.
* Tujuan perubahan.
* Dampak.

## D. Database Changes

* Migration.
* Unique constraints.
* Index.
* State changes.

## E. Test Results

* Command yang dijalankan.
* Passed.
* Failed.
* Blocked.

## F. Security Results

* Private key handling.
* Nonce replay.
* Webhook authorization.
* RPC verification.
* Fake USDC rejection.
* Underpayment rejection.
* Duplicate signature rejection.

## G. Demo Steps

Berikan alur demo maksimal lima menit.

## H. Remaining Risks

* Devnet limitation.
* RPC dependency.
* Wallet phishing.
* Refund limitation.
* Wrong-network risk.
* Off-ramp limitation.
* Regulatory considerations.

Jangan menyatakan berhasil sebelum test benar-benar dijalankan.

Jika ada bagian yang blocked, jelaskan secara spesifik apa yang kurang dan jangan membuat hasil palsu.


https://www.alchemy.com/ => rpc backend
https://faucet.solana.com/ => testnet
# Naskah Demo Involoop (5 menit)

Setup sebelum demo:
- Window A: browser utama, sudah login `demo-owner@involoop.app` / `involoop-demo-2026`.
- Window B: incognito (klien).
- Cadangan: `demo-client@involoop.app` sudah signup via referral — kalau link live
  bikin invoice, data demo lama tetap ada di dashboard A.

## 0:00 — Pembuka (15 detik)
"Involoop mengubah invoice biasa jadi distribution loop. Tanpa mengubah cara
kerja freelancer, setiap tagihan yang dikirim ikut mencari pengguna baru."

## 0:15 — Masalah (45 detik)
Freelancer kirim invoice ke sesama pelaku jasa B2B — penerima yang relevan,
hadir di momen bernilai tinggi. Tapi invoice berhenti sebagai transaksi, tidak
pernah jadi jalur distribusi. Channel itu belum pernah dipakai.

## 0:50 — User A bikin invoice via AI (60 detik)
Dashboard A → "Buat invoice". Ketik satu kalimat:
"Tagih PT Kreatif Digital Rp2.500.000 untuk pengembangan landing page, jatuh tempo 12 Agustus 2026."
AI parse → invoice + CTA referral kontekstual (tunjuk hasil). Salin link,
tempel di Window B. Titik: "satu kalimat, bukan form."

## 1:50 — User B = client, pays (80 detik)
Window B: public invoice (nomor, sender, dates, detail, Rp2.500.000). Tunjuk
panel status "Belum dibayar" + badge **Stripe Test Mode**. Klik **"Saya sudah
transfer"** → status berubah **"Menunggu verifikasi"**. Titik: "konfirmasi
transfer manual — pembayaran beneran nanti via Stripe; demo ini jujur soal
scope, tanpa klaim integrasi." Lalu CTA referral: "Dapatkan 5 kredit gratis saat
kamu bergabung lewat invoice ini →" → klik (referral click tercatat).

## 3:10 — B daftar via referral (60 detik)
URL signup bawa `ref_invoice`. Isi nama, email, password → daftar → langsung
masuk dashboard B. Tunjuk saldo B = 5 kredit (3 awal + 2 bonus).

## 4:10 — Bukti loop ke A (60 detik)
Balik ke Window A → refresh dashboard. Tunjuk:
1. Stat: tampilan invoice naik, referral berhasil = 1, konversi.
2. Riwayat kredit (ledger): `+3 Referral dari INV-...`, sumber jelas.
3. Saldo A bertambah.
4. Invoice status → "Menunggu verifikasi" → klik "Verifikasi pembayaran" → Lunas.
Tutup: "Loop lengkap — A kirim invoice, B bayar & daftar, A dapat kredit.
Semua tercatat, bisa diaudit dari ledger."

## 4:30 — Pricing (30 detik)
"1 kredit = 1 invoice publik. Gratis 3 invoice. Referral +3. Klien +2. Pro
berbayar Rp29.000/10 dan Rp79.000/50 invoice — itulah cara Involoop
menghasilkan uang, tanpa iklan."

## 4:40 — First 100 users (20 detik)
"Freelance developer, designer, consultant, video editor, dan micro-agency
Indonesia yang menagih sesama pelaku jasa — lewat komunitas WhatsApp/Discord
freelancer, direct outreach ke pengguna invoice PDF manual, dan 10 pilot yang
kirim minimal 3 invoice nyata."

## Q&A cadangan
- **Kenapa klien mau signup?** Fokus ke freelancer/micro-agency yang juga
  menagih kliennya sendiri. Penerima invoice bagian dari jaringan jasa B2B
  yang sama — bukan konsumen umum.
- **Kenapa bukan PDF/Google Docs?** PDF hanya menampilkan tagihan. Involoop
  punya public payment page, tracking view, CTA kontekstual, reward attribution,
  dan ledger yang bisa diaudit.
- **Anti-fraud?** Reward sekali per akun baru (unique `referred_user_id`),
  self-referral ditolak, kredit disimpan di ledger idempotent (`idempotency_key`
  unique), email dinormalisasi. Refresh/double-submit tidak menggandakan reward.
- **Pembayaran beneran?** Belum — jujur: B konfirmasi transfer →
  `awaiting_verification` → A verifikasi → `paid`. Tanpa gateway. Ini scope
  yang sengaja jujur, bukan klaim integrasi.
- **Siapa yang membayar?** Freelancer/micro-agency yang butuh lebih dari paket
  gratis. Referral menjaga biaya menagih tetap ter-cover.
- **Kenapa nggak kirim invoice langsung?** Channel (WA/email) sengaja di luar
  scope — freelancer pakai channel yang sudah biasa mereka pakai; aplikasi
  menghasilkan link publik.

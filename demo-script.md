# Naskah Demo Involoop (5 menit)

Setup sebelum demo: dua profil browser — Window A (incognito, user A) dan
Window B (incognito lain). Login/dashboard A sudah terbuka. Jaring pengaman:
punya dua email cadangan kalau signup kena rate-limit.

## 0:00 — Satu kalimat pembuka (15 detik)
"Setiap tagihan yang saya kirim jadi distributor saya. Ini Involoop — invoicing
yang bawa mekanisme pertumbuhannya sendiri, tertanam di titik transaksi."

## 0:15 — Masalah (45 detik)
Freelancer solo nggak punya marketing. Solusi lama = bangun audiens, bikin
konten, iklan — kerjaan di luar menagih klien. Padahal freelancer sudah kirim
tagihan tiap minggu, ke orang yang pas di target: freelancer lain atau
pemilik bisnis kecil. Itu channel distribusi yang belum dipakai.

## 1:00 — User A bikin invoice via AI (60 detik)
Buka Window A → dashboard → "Buat invoice". Ketik satu kalimat:
"tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu".
AI parse jadi field + tulis CTA referral yang disesuaikan (tunjuk hasilnya).
Copy link, paste di URL bar Window B. Tekankan: "satu kalimat, bukan form."

## 2:00 — User B = klien, bayar & lihat CTA (60 detik)
Window B: halaman invoice, klik "Bayar sekarang" → jadi "Sudah dibayar".
Di bawah tombol bayar, CTA AI-nya. Baca lantang. Klik "Coba gratis".

## 3:00 — B daftar lewat link referral (60 detik)
Form signup sudah keisi `ref_invoice` (bisa tunjuk ke URL). Isi nama, email,
password → daftar. Langsung masuk dashboard B.

## 4:00 — Bukti loop ke A (60 detik)
Kembali ke Window A → refresh dashboard. Tunjuk dua hal:
1. "Referral berhasil" naik ke 1, nama B + tanggal muncul di daftar.
2. Kredit invoice A naik (3 → 6). Bonus B: 3 + 2 = 5 kredit.
Tutup: "Kedua pihak di loop ini dihargai, dan semuanya terjadi tanpa A
ngapa-ngapain selain kirim tagihan normal."

## 4:45 — Closing (15 detik)
"Distribution-first: invoice-nya sendiri yang nyebarin. 100 pengguna pertama
saya ambil dari r/freelance, r/digitalnomad, dan komunitas Discord
Freelance-to-Founder — tempat referral klien memang budaya yang sudah jalan."

## Q&A cadangan
- **Anti-fraud?** Secara sengaja di luar scope — hackathon bikin loop harus
  jalan e2e. Mitigasi beneran (reward cuma kalau B bikin/bayar invoice)
  ditandai di kode `app/api/signup/route.ts`.
- **Kenapa nggak kirim invoice langsung?** Channel kirim (WA/email) sengaja
  di luar scope biar demo nggak tergantung API eksternal — freelancer kirim
  lewat channel yang sudah mereka pakai.
- **Pembayaran beneran?** Disimulasikan, juga biar demo nggak bergantung
  gateway pembayaran.
- **Monetisasi?** Kredit jadi mekanisme viral + barrier; rencana lanjut = Pro
  langganan untuk kredit unlimited (belum di scope).

# Naskah Video Demo Involoop (rekaman, 5 menit, bahasa Inggris)

Judges open the video first. Narrate in English, keep UI in the English default
language. Record at 1080p, screen only (no camera). Export as unlisted YouTube,
paste the link into the submission form.

## Setup sebelum rekam

- Window A (normal browser): logged in as `demo-owner@involoop.app` / `involoop-demo-2026`
- Window B (incognito): closed, ready for a fresh client signup
- Fresh client email for B (never used before, e.g. `video-client-<tanggal>@involoop.app`)
- Confirm dashboard A already shows existing proof (1 paid invoice + 1 referral)
- Stop any browser extensions that overlay the screen

---

## 0:00 — Intro (landing page, 15 detik)

Narasi:
> "This is Involoop — invoices that bring your next user. Type one sentence, get
> a shareable invoice, and every invoice quietly recruits the next one."

Aksi: tampilkan `involoop.vercel.app`, scroll hero, tunjukkan CTA
**"View live sample"** dan klik → buka public invoice yang LUNAS (INV-2026-016).
Tunjuk "Payment received" lalu kembali ke landing.

## 0:15 — Masalah (45 detik)

Narasi:
> "Freelancers bill other businesses every week. The invoice is a transaction —
> it dies the moment it's paid. Involoop turns that same invoice into a growth
> channel. No extra marketing, no changing how you work."

Aksi: scroll landing ke **WHY INVOLOOP** dan **HOW IT WORKS** (5 langkah).
Tunjuk reward dua arah: referrer +3, client +2.

## 1:00 — User A membuat invoice via AI (60 detik)

Narasi:
> "Let's bill a client. One sentence."

Aksi:
1. Window A → dashboard → **+ Create invoice**
2. Ketik di textarea: `Bill Meridian Creative 2.5 million IDR for landing page development, due August 12, 2026.`
3. Klik **Create invoice with AI**
4. AI mengisi form: client, description, amount, due date, referral CTA
5. Narasi: "AI filled the whole form — client, amount, due date, and a
   context-aware referral line. We can edit anything before publishing."
6. Klik **Publish invoice**
7. Panel sukses: "Invoice ready. Send this link to your client:" + tombol
   **Copy link** + **Send via WhatsApp**

Tunjuk stepper di atas: Write → Review & edit → Publish.

## 2:00 — User B = client, membuka & membayar (70 detik)

Aksi:
1. Window B (incognito): paste link → public invoice
2. Narasi: "No login needed. Here's the invoice — sender, number, amount,
   due date."
3. Tunjuk panel status "Unpaid" + badge **Stripe Test Mode**
4. Klik **I have completed the transfer** → status berubah
   **"Awaiting sender verification"**
5. Narasi: "The client confirms a transfer; the owner verifies. No fake
   gateway claim — Stripe is available in test mode, manual confirmation is
   the honest demo path."
6. Tunjuk CTA referral card: **"Create an invoice like this — free"** dan
   klik **"Get 5 free credits when you join through this invoice →"**

## 3:10 — User B mendaftar via referral (60 detik)

Aksi:
1. Window B: halaman signup terbuka membawa `ref_invoice=...`
2. Narasi: "The URL carries the invoice — attribution survives the signup."
3. Isi: Full name `Rina Wijaya`, email `video-client-<tanggal>@involoop.app`,
   password `involoop-demo-2026`
4. Klik **Create account** → langsung masuk dashboard B
5. Tunjuk saldo B: **5 credits** (3 base + 2 bonus)
6. Narasi: "Both sides get rewarded. The client starts with 5 free credits."

## 4:10 — Bukti loop ke A (50 detik)

Aksi:
1. Window A: refresh dashboard
2. Tunjuk:
   - Stat: invoice views naik, referral CTA clicks naik, **Successful referrals 2**
   - Invoice baru berstatus **Awaiting verification** → klik **Verify** → **Paid**
   - Kartu Referral program: kode referral + baris `video-client... +3 credits`
   - Credit history (ledger): `+3 Referral from INV-...`, `-1 Publish INV-...`
   - Saldo A bertambah
3. Narasi: "Views, clicks, signup, payment, credits — every step is recorded in
   an auditable ledger. The loop is provable end to end."

## 4:40 — Penutup (20 detik)

Aksi: scroll landing ke **Pricing**.

Narasi:
> "1 credit = 1 public invoice. Start free with 3. Earn more by referring —
> that's how billing pays for itself. First 100 users: 40 freelancers on
> Projects.co.id, 30 designers and developers from LinkedIn, 20 service
> providers on Sribulancer, and 10 pilot users sending real invoices. Involoop
> spreads by being used — each paid invoice finds the next user."

---

## Checklist setelah rekam

- [ ] Video ≤ 5 menit, 1080p, audio jelas
- [ ] Subtitle/CC bahasa Inggris (opsional, +nilai)
- [ ] Upload unlisted → paste link ke form
- [ ] Jangan reset demo sebelum presentasi (menghapus invoice contoh)
- [ ] Untuk live demo juri, gunakan email baru untuk B

export type Lang = "en" | "id";

export const LANG_COOKIE = "involoop_lang";

export function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const m = document.cookie.match(/(?:^|;\s*)involoop_lang=([^;]+)/);
  const v = m ? m[1] : "en";
  return v === "id" ? "id" : "en";
}

export function setLangCookie(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

type Pair = readonly [string, string];
type Item = { en: readonly [string, string, string]; id: readonly [string, string, string] };

export const landing = {
  nav: { why: ["Why", "Kenapa"] as Pair, features: ["Features", "Fitur"] as Pair, process: ["How it works", "Cara kerja"] as Pair, reward: ["Reward", "Reward"] as Pair, pricing: ["Pricing", "Harga"] as Pair, getStarted: ["Start free", "Mulai gratis"] as Pair },
  hero: {
    badge: ["Distribution-first invoicing", "Distribution-first invoicing"] as Pair,
    h1a: ["Create invoices in seconds.", "Buat invoice dalam hitungan detik."] as Pair,
    h1b: ["Earn your next invoice for free.", "Dapatkan invoice berikutnya secara gratis."] as Pair,
    sub: [
      "Turn a single sentence into a shareable invoice, accept payment, and earn credits when another professional joins through your invoice.",
      "Tulis tagihan dalam satu kalimat, kirim lewat link, dan dapatkan kredit saat klien bisnismu ikut menggunakan Involoop.",
    ] as Pair,
    cta1: ["Create your first invoice →", "Buat invoice pertama →"] as Pair,
    cta2: ["Sign in", "Masuk"] as Pair,
    cta3: ["View live sample", "Lihat contoh invoice"] as Pair,
    p1: ["1 credit = 1 public invoice", "1 kredit = 1 invoice publik"] as Pair,
    p2: ["+3 reward per referral", "+3 reward per referral"] as Pair,
    p3: ["+2 bonus for the client", "+2 bonus untuk klien"] as Pair,
  },
  personas: {
    en: ["DESIGNERS", "DEVELOPERS", "CONSULTANTS", "VIDEO EDITORS", "FREELANCERS", "CREATORS B2B"],
    id: ["DESAINER", "DEVELOPER", "KONSULTAN", "VIDEO EDITOR", "FREELANCER SOLO", "CREATOR B2B"],
  },
  why: {
    eyebrow: ["WHY INVOLOOP", "KENAPA INVOLOOP"] as Pair,
    title: ["Your invoice already has distribution. We make it work.", "Tagihanmu sudah punya distribusi. Kami membuatnya bekerja."] as Pair,
    point1: ["◆ No extra promotion", "◆ Tanpa promosi tambahan"] as Pair,
    point2: ["◆ No long forms", "◆ Tanpa form panjang"] as Pair,
    point3: ["◆ Two-way rewards", "◆ Reward dua arah"] as Pair,
    body1: [
      "Involoop is built for B2B service professionals who both buy and sell professional services — freelancers, consultants, and micro-agencies.",
      "Involoop dibuat untuk freelancer, micro-agency, dan profesional jasa B2B yang saling membeli dan menjual jasa.",
    ] as Pair,
    body2: [
      "You already invoice other businesses every week. That is a relevant audience at a high-value moment — and it has never been used as a growth channel.",
      "Freelancer sudah rutin mengirim invoice ke bisnis dan profesional lain. Itu audiens relevan di momen bernilai tinggi yang belum dipakai sebagai jalur pertumbuhan.",
    ] as Pair,
    m1: ["3", "3"] as Pair, m1l: ["Free credits", "Kredit awal"] as Pair,
    m2: ["+3", "+3"] as Pair, m2l: ["For the referrer", "Untuk referrer"] as Pair,
    m3: ["+2", "+2"] as Pair, m3l: ["For the client", "Untuk klien"] as Pair,
    cta: ["Try it now →", "Coba sekarang →"] as Pair,
  },
  features: {
    eyebrow: ["CORE FEATURES", "FITUR INTI"] as Pair,
    title: ["One flow to bill and to grow.", "Satu alur untuk menagih dan tumbuh."] as Pair,
    items: [
      { en: ["01", "One-sentence invoices", "AI turns a natural sentence into client, amount, description, due date, and a context-aware referral line."], id: ["01", "Invoice dari satu kalimat", "AI memecah kalimat tagihan jadi nama klien, nominal, deskripsi, tenggat, dan CTA referral."] },
      { en: ["02", "Public shareable link", "Send the invoice through any channel you already use — no new delivery setup."], id: ["02", "Link publik siap kirim", "Bagikan invoice lewat channel yang sudah kamu pakai tanpa setup pengiriman baru."] },
      { en: ["03", "Secure payment", "Clients see payment instructions and pay securely — Stripe Connect or manual confirmation."], id: ["03", "Konfirmasi pembayaran", "Klien melihat instruksi pembayaran dan mengonfirmasi transfer dari halaman invoice."] },
      { en: ["04", "Context-aware referral", "AI writes an invite that matches the service billed — never generic ad copy."], id: ["04", "CTA yang relevan", "AI menulis ajakan sesuai jasa yang ditagih, bukan iklan generik."] },
      { en: ["05", "Two-way rewards", "You earn 3 credits per referral; the client who joins gets 2 bonus credits."], id: ["05", "Reward dua arah", "Kamu dapat 3 kredit per referral; klien yang daftar mendapat 2 bonus."] },
      { en: ["06", "Auditable proof", "Referrals, credits, and invoices appear in the dashboard — the loop is provable end to end."], id: ["06", "Loop terlihat jelas", "Referral, kredit, dan invoice tampil di dashboard — loop bisa dibuktikan end to end."] },
    ] as Item[],
    tryCta: ["Try it →", "Coba fitur →"] as Pair,
  },
  process: {
    eyebrow: ["PRODUCT FLOW", "ALUR PRODUK"] as Pair,
    title: ["Five steps. One complete loop.", "Lima langkah. Satu loop lengkap."] as Pair,
    sub: ["From a single billing sentence to a referral that lands back in your dashboard.", "Dari satu kalimat tagihan sampai referral yang kembali ke dashboard-mu."] as Pair,
    steps: [
      { en: ["01", "Write", "Describe an invoice in one sentence."], id: ["01", "Tulis", "Tulis tagihan natural seperti berbicara ke asisten."] },
      { en: ["02", "Publish", "Involoop creates a public invoice with a CTA."], id: ["02", "Susun", "AI mengubahnya menjadi invoice terstruktur dan CTA kontekstual."] },
      { en: ["03", "Share", "Send the link to your business client."], id: ["03", "Kirim", "Bagikan link publik lewat channel pilihanmu."] },
      { en: ["04", "Get paid", "Accept secure payment or confirm a transfer."], id: ["04", "Bayar", "Klien menyelesaikan tagihan dari halaman yang bersih."] },
      { en: ["05", "Grow", "Both accounts earn credits — the loop restarts."], id: ["05", "Tumbuh", "Klien mendaftar, kedua pihak mendapat kredit, loop dimulai lagi."] },
    ] as Item[],
  },
  reward: {
    eyebrow: ["TWO-WAY REWARDS", "REWARD DUA ARAH"] as Pair,
    title: ["Both sides win. The loop runs itself.", "Kedua pihak menang. Loop lanjut sendiri."] as Pair,
    lead: ["No change to how freelancers work. Rewards only appear when a referral actually signs up.", "Freelancer tidak perlu mengubah cara kerja. Reward muncul hanya ketika referral benar-benar selesai mendaftar."] as Pair,
    a: ["A", "A"] as Pair, at: ["Freelancer", "Freelancer"] as Pair, av: ["+3 credits", "+3 kredit"] as Pair, ad: ["Every successful referral from an invoice.", "Setiap referral berhasil dari invoice."] as Pair,
    b: ["B", "B"] as Pair, bt: ["Client", "Klien"] as Pair, bv: ["+2 credits", "+2 kredit"] as Pair, bd: ["Bonus on top of the standard signup credits.", "Bonus di atas kredit signup biasa."] as Pair,
    cta: ["Start your first loop", "Mulai loop pertamamu"] as Pair,
  },
  pricing: {
    eyebrow: ["PRICING", "HARGA"] as Pair,
    title: ["One credit, one public invoice.", "Satu kredit, satu invoice publik."] as Pair,
    sub: ["1 credit = 1 public invoice. Credits come from referrals, so billing cost can pay for itself through distribution.", "1 kredit = 1 invoice publik. Kredit didapat dari referral, sehingga biaya menagih bisa terbayar dari distribusi."] as Pair,
    free: ["Free", "Gratis"] as Pair, freePrice: ["$0", "Rp 0"] as Pair, freeDesc: ["Start billing at no cost.", "Mulai menagih tanpa biaya."] as Pair,
    f1: ["3 public invoices", "3 invoice publik"] as Pair, f2: ["+3 credits per referral", "+3 kredit per referral"] as Pair, f3: ["Public link + referral CTA", "Link publik + CTA referral"] as Pair,
    starter: ["Starter", "Starter"] as Pair, starterPrice: ["$3", "Rp 29.000"] as Pair, starterWhen: [" one-time", " sekali"] as Pair, starterDesc: ["For freelancers billing weekly.", "Untuk freelancer aktif menagih tiap minggu."] as Pair,
    s1: ["10 public invoices", "10 invoice publik"] as Pair, s2: ["Stripe payment", "Pembayaran Stripe"] as Pair, s3: ["Basic analytics", "Analitik dasar"] as Pair,
    pro: ["Pro", "Pro"] as Pair, proPrice: ["$8", "Rp 79.000"] as Pair, proWhen: ["/month", "/bulan"] as Pair, proDesc: ["For micro-agencies and high volume.", "Untuk micro-agency dan volume tinggi."] as Pair,
    p1: ["50 public invoices", "50 invoice publik"] as Pair, p2: ["Advanced analytics", "Analitik lanjutan"] as Pair, p3: ["Custom branding", "Branding khusus"] as Pair,
    ctaStart: ["Start", "Mulai"] as Pair, ctaContact: ["Contact us", "Hubungi kami"] as Pair,
    note: ["Paid plans will open after the marathon demo.", "Langganan berbayar belum diaktifkan di hackathon — paket ini menjelaskan bagaimana Involoop menghasilkan uang."] as Pair,
  },
  finalCta: {
    eyebrow: ["READY TO BILL?", "SIAP MENAGIH?"] as Pair,
    title: ["Create one invoice. Let the product find your next user.", "Buat satu invoice. Biarkan produkmu ikut menyebar."] as Pair,
    sub: ["Free credits. No credit card. A shareable link in seconds.", "Gratis kredit. Tanpa kartu kredit. Link publik siap dikirim."] as Pair,
    cta: ["Start free →", "Daftar gratis →"] as Pair,
  },
  footer: { tag: ["Invoices that bring your next user.", "Invoice yang menyebar sendiri."] as Pair, login: ["Sign in", "Masuk"] as Pair, privacy: ["Privacy Policy", "Kebijakan Privasi"] as Pair, terms: ["Terms of Service", "Ketentuan Layanan"] as Pair, payments: ["Payment Disclaimer", "Disclaimer Pembayaran"] as Pair, github: ["GitHub Repository", "Repositori GitHub"] as Pair, contact: ["Contact", "Kontak"] as Pair },
} as const;

export function landingText(lang: Lang, key: string): string {
  const parts = key.split(".");
  let node: any = landing;
  for (const part of parts) node = node[part];
  if (!node || typeof node === "string") return key;
  const idx = lang === "en" ? 0 : 1;
  const val = node[idx];
  return typeof val === "string" ? val : key;
}

export function landingItems(lang: Lang, key: string): Array<[string, string, string]> {
  const parts = key.split(".");
  let node: any = landing;
  for (const part of parts) node = node[part];
  if (!Array.isArray(node)) return [];
  return node.map((item: Item) => [...item[lang]]);
}

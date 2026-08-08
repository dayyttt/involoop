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
  nav: {
    why: ["Why", "Kenapa"] as Pair,
    features: ["Features", "Fitur"] as Pair,
    process: ["How it works", "Cara kerja"] as Pair,
    reward: ["Reward", "Reward"] as Pair,
    pricing: ["Pricing", "Harga"] as Pair,
    faq: ["FAQ", "FAQ"] as Pair,
    getStarted: ["Start free", "Mulai gratis"] as Pair,
    dashboard: ["Dashboard", "Dashboard"] as Pair,
    createInvoice: ["Create an invoice", "Buat invoice"] as Pair,
    openMenu: ["Open menu", "Buka menu"] as Pair,
    closeMenu: ["Close menu", "Tutup menu"] as Pair,
  },
  hero: {
    badge: ["Distribution-first invoicing", "Distribution-first invoicing"] as Pair,
    h1a: ["Create invoices in seconds.", "Buat invoice dalam hitungan detik."] as Pair,
    h1b: ["Your next invoice is free.", "Invoice berikutnya gratis."] as Pair,
    rotPrefix: ["Your next invoice is", "Invoice berikutnya"] as Pair,
    rotWords: ["free.", "one sentence away.", "covered by a referral."] as [string, string, string],
    rotWordsId: ["gratis.", "cukup satu kalimat.", "ditanggung referral."] as [string, string, string],
    // Short on purpose: the numbers moved to the scannable row below, so this
    // sentence only has to land the idea.
    sub: [
      "Write one sentence, get a payment link you can send anywhere.",
      "Tulis satu kalimat, dapat link tagihan yang bisa dikirim ke mana saja.",
    ] as Pair,
    cta1: ["Create your first invoice →", "Buat invoice pertama →"] as Pair,
    ctaSignedIn: ["Create an invoice →", "Buat invoice →"] as Pair,
    cta2: ["Sign in", "Masuk"] as Pair,
    cta3: ["View live sample", "Lihat contoh invoice"] as Pair,
    // One row, three facts, numbers emphasised so the eye catches them without
    // reading. The old version repeated the paragraph above it and then said
    // "free" a third time in a second grey line underneath.
    p1s: ["3 invoices", "3 invoice"] as Pair,
    p1r: ["free to start", "gratis untuk mulai"] as Pair,
    p2s: ["+3", "+3"] as Pair,
    p2r: ["each time a client joins", "tiap ada klien yang ikut"] as Pair,
    p3s: ["No credit card", "Tanpa kartu kredit"] as Pair,
    p3r: ["", ""] as Pair,
  },
  demo: {
    title: ["Try it right here. No account needed.", "Coba langsung di sini. Tanpa daftar."] as Pair,
    sub: [
      "Type how you would say it out loud. The AI turns it into a real invoice.",
      "Ketik seperti kamu ngomong sehari-hari. AI yang menyusun jadi invoice.",
    ] as Pair,
    placeholder: [
      "e.g. bill Rina 2 million for a logo design, due in 2 weeks",
      "cth. tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu",
    ] as Pair,
    run: ["See the invoice →", "Lihat invoicenya →"] as Pair,
    running: ["Composing…", "Menyusun…"] as Pair,
    tryThis: ["Try:", "Coba:"] as Pair,
    resultLabel: ["THIS IS WHAT YOUR CLIENT WOULD SEE", "INI YANG DILIHAT KLIENMU"] as Pair,
    to: ["TO", "UNTUK"] as Pair,
    due: ["Due", "Jatuh tempo"] as Pair,
    ctaLine: ["Referral line written for this job:", "Ajakan yang ditulis untuk pekerjaan ini:"] as Pair,
    publish: ["Publish this invoice free →", "Terbitkan invoice ini gratis →"] as Pair,
    keepHint: [
      "We keep this sentence, so you never type it twice.",
      "Kalimat ini kami simpan, jadi kamu tidak perlu mengetik dua kali.",
    ] as Pair,
    again: ["Try another sentence", "Coba kalimat lain"] as Pair,
    failed: [
      "Could not read that sentence. Try mentioning who, what, and how much.",
      "Kalimatnya belum terbaca. Sebutkan siapa, jasa apa, dan berapa nominalnya.",
    ] as Pair,
    limit: [
      "Demo limit reached. Create a free account to keep going.",
      "Batas demo tercapai. Buat akun gratis untuk lanjut.",
    ] as Pair,
  },
  marquee: {
    label: ["Shared through the channels you already use", "Dikirim lewat channel yang sudah kamu pakai"] as Pair,
  },
  how: {
    eyebrow: ["IN PLAIN WORDS", "DENGAN BAHASA SEDERHANA"] as Pair,
    title: ["Three steps. No jargon.", "Tiga langkah. Tanpa istilah teknis."] as Pair,
    items: [
      {
        en: ["1", "Describe the bill", "Type what you sold, like “bill Rina 2 million for a logo design”."],
        id: ["1", "Tulis tagihannya", "Ketik jasa yang kamu jual, contoh “tagih Rina 2 juta buat desain logo”."],
      },
      {
        en: ["2", "Share one link", "AI builds a clean public invoice you can send on WhatsApp, email, anywhere."],
        id: ["2", "Kirim satu link", "AI membuat invoice publik yang rapi, kirim lewat WhatsApp, email, di mana saja."],
      },
      {
        en: ["3", "Get paid and grow", "The client pays, and both accounts earn credits for the next invoice."],
        id: ["3", "Dibayar dan bertumbuh", "Klien membayar, lalu kedua akun mendapat kredit untuk invoice berikutnya."],
      },
    ] as Item[],
  },
  personas: {
    en: ["DESIGNERS", "DEVELOPERS", "CONSULTANTS", "VIDEO EDITORS", "FREELANCERS", "CREATORS B2B"],
    id: ["DESAINER", "DEVELOPER", "KONSULTAN", "VIDEO EDITOR", "FREELANCER SOLO", "CREATOR B2B"],
  },
  why: {
    eyebrow: ["WHY INVOLOOP", "KENAPA INVOLOOP"] as Pair,
    title: ["Your invoice already has distribution. We make it work.", "Tagihanmu sudah punya distribusi. Kami membuatnya bekerja."] as Pair,
    point1: ["No extra promotion", "Tanpa promosi tambahan"] as Pair,
    point2: ["No long forms", "Tanpa form panjang"] as Pair,
    point3: ["Two-way rewards", "Reward dua arah"] as Pair,
    body1: [
      "Involoop is built for B2B service professionals who both buy and sell professional services, freelancers, consultants, and micro-agencies.",
      "Involoop dibuat untuk freelancer, micro-agency, dan profesional jasa B2B yang saling membeli dan menjual jasa.",
    ] as Pair,
    body2: [
      "You already invoice other businesses every week. That is a relevant audience at a high-value moment, and it has never been used as a growth channel.",
      "Freelancer sudah rutin mengirim invoice ke bisnis dan profesional lain. Itu audiens relevan di momen bernilai tinggi yang belum dipakai sebagai jalur pertumbuhan.",
    ] as Pair,
    m1: ["3", "3"] as Pair, m1l: ["Invoices when you start", "Invoice saat mulai"] as Pair,
    m2: ["+3", "+3"] as Pair, m2l: ["For you, per client who joins", "Untukmu, tiap klien ikut"] as Pair,
    m3: ["+2", "+2"] as Pair, m3l: ["Bonus for that client", "Bonus untuk klien itu"] as Pair,
    caption: [
      "The way it works today — and the same invoice, one link away.",
      "Cara yang dipakai sekarang — dan invoice yang sama, tinggal satu link.",
    ] as Pair,
    cta: ["Try it now →", "Coba sekarang →"] as Pair,
  },
  features: {
    eyebrow: ["CORE FEATURES", "FITUR INTI"] as Pair,
    title: ["One flow to bill and to grow.", "Satu alur untuk menagih dan tumbuh."] as Pair,
    items: [
      { en: ["01", "One-sentence invoices", "AI turns a natural sentence into client, amount, description, due date, and a context-aware referral line."], id: ["01", "Invoice dari satu kalimat", "AI memecah kalimat tagihan jadi nama klien, nominal, deskripsi, tenggat, dan CTA referral."] },
      { en: ["02", "Public shareable link", "Send the invoice through any channel you already use, no new delivery setup."], id: ["02", "Link publik siap kirim", "Bagikan invoice lewat channel yang sudah kamu pakai tanpa setup pengiriman baru."] },
      { en: ["03", "Secure payment", "Clients see payment instructions and pay securely, PayPal or manual confirmation."], id: ["03", "Konfirmasi pembayaran", "Klien melihat instruksi pembayaran dan mengonfirmasi transfer dari halaman invoice."] },
      { en: ["04", "Context-aware referral", "AI writes an invite that matches the service billed, never generic ad copy."], id: ["04", "CTA yang relevan", "AI menulis ajakan sesuai jasa yang ditagih, bukan iklan generik."] },
      { en: ["05", "Two-way rewards", "You earn 3 credits per referral; the client who joins gets 2 bonus credits."], id: ["05", "Reward dua arah", "Kamu dapat 3 kredit per referral; klien yang daftar mendapat 2 bonus."] },
      { en: ["06", "Auditable proof", "Referrals, credits, and invoices appear in the dashboard, the loop is provable end to end."], id: ["06", "Loop terlihat jelas", "Referral, kredit, dan invoice tampil di dashboard, loop bisa dibuktikan end to end."] },
    ] as Item[],
    tryCta: ["Try it →", "Coba fitur →"] as Pair,
    // Shown when a card is pointed at: a concrete example, so hovering pays
    // for itself instead of just lighting up a border.
    d1: [
      "Type “bill Rina 2 million for a logo” and you get the client, the amount, the due date and the invite line.",
      "Ketik “tagih Rina 2 juta buat logo”, keluar nama klien, nominal, jatuh tempo, dan kalimat ajakannya.",
    ] as Pair,
    d2: [
      "One link. Your client opens it in WhatsApp and pays — no account, no app to install.",
      "Satu link. Klien buka di WhatsApp lalu bayar — tanpa akun, tanpa install aplikasi.",
    ] as Pair,
    d3: [
      "PayPal payments land in your own PayPal account. Bank transfer stays an option.",
      "Pembayaran PayPal masuk ke akun PayPal milikmu. Transfer bank tetap tersedia.",
    ] as Pair,
    d4: [
      "A designer's invoice invites design clients — not a generic advert shown to everyone.",
      "Invoice desainer mengajak klien desain — bukan iklan umum untuk semua orang.",
    ] as Pair,
    d5: [
      "Three invoices back for you, two for them. Neither side pays for the other.",
      "Tiga invoice balik untukmu, dua untuk dia. Tidak ada pihak yang menanggung yang lain.",
    ] as Pair,
    d6: [
      "Every credit movement is a ledger row you can open and check, not just a balance.",
      "Tiap pergerakan kredit jadi baris ledger yang bisa dibuka dan diperiksa, bukan cuma saldo.",
    ] as Pair,
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
      { en: ["05", "Grow", "Both accounts earn credits, the loop restarts."], id: ["05", "Tumbuh", "Klien mendaftar, kedua pihak mendapat kredit, loop dimulai lagi."] },
    ] as Item[],
  },
  reward: {
    eyebrow: ["TWO-WAY REWARDS", "REWARD DUA ARAH"] as Pair,
    title: ["Both sides win. The loop runs itself.", "Kedua pihak menang. Loop lanjut sendiri."] as Pair,
    lead: ["1 credit = 1 invoice you can publish. Credits only move when a client actually finishes signing up.", "1 kredit = 1 invoice yang bisa kamu terbitkan. Kredit hanya bergerak saat klien benar-benar selesai mendaftar."] as Pair,
    a: ["A", "A"] as Pair, at: ["Freelancer", "Freelancer"] as Pair, ad: ["Every successful referral from an invoice.", "Setiap referral berhasil dari invoice."] as Pair,
    b: ["B", "B"] as Pair, bt: ["Client", "Klien"] as Pair, bd: ["Bonus on top of the standard signup credits.", "Bonus di atas kredit signup biasa."] as Pair,
    creditsWord: ["credits", "kredit"] as Pair,
    keyYou: ["You", "Kamu"] as Pair,
    keyClient: ["Your client", "Klienmu"] as Pair,
    cta: ["Start your first loop", "Mulai loop pertamamu"] as Pair,
  },
  testimonials: {
    eyebrow: ["BUILT FOR B2B SERVICES", "UNTUK PEKERJA JASA B2B"] as Pair,
    title: ["Fits the work you already do.", "Cocok dengan cara kerja yang sudah ada."] as Pair,
    sub: ["No new marketing workflow. Just send a better invoice through the same channel you use today.", "Tanpa alur pemasaran baru. Cukup kirim invoice yang lebih baik lewat channel yang sudah kamu gunakan."] as Pair,
    items: [
      {
        en: ["Branding designer", "Project-based billing, client approvals", "Turn a project sentence into a polished invoice and send it through WhatsApp, no PDF export or new client account."],
        id: ["Desainer branding", "Tagihan per proyek, persetujuan klien", "Ubah kalimat proyek jadi invoice rapi dan kirim lewat WhatsApp, tanpa ekspor PDF atau akun baru untuk klien."],
      },
      {
        en: ["Web developer", "Milestone invoices, micro-agency work", "Share one public link, confirm payment, and let the same artifact introduce Involoop to another service business."],
        id: ["Web developer", "Invoice per milestone, kerja micro-agency", "Bagikan satu link publik, konfirmasi pembayaran, lalu biarkan artefak yang sama mengenalkan Involoop ke bisnis jasa lain."],
      },
      {
        en: ["Independent consultant", "Recurring client work, clear records", "Keep every invoice, view, referral click, signup, and credit movement visible from one dashboard."],
        id: ["Konsultan independen", "Klien berulang, catatan yang jelas", "Simpan invoice, view, klik referral, pendaftaran, dan pergerakan kredit dalam satu dashboard."],
      },
    ] as Item[],
  },
  trust: {
    eyebrow: ["TRUST & SECURITY", "KEPERCAYAAN & KEAMANAN"] as Pair,
    title: ["Built to be checked.", "Dibangun supaya bisa diperiksa."] as Pair,
    sub: ["No vague marketing promises. The loop is provable from your own dashboard.", "Tanpa janji pemasaran yang kabur. Loop bisa dibuktikan dari dashboard-mu sendiri."] as Pair,
    items: [
      {
        en: ["01", "Secure payments", "PayPal processes payment; Involoop never stores card or account data."],
        id: ["01", "Pembayaran aman", "PayPal yang memproses; Involoop tidak pernah menyimpan data kartu atau akun."],
      },
      {
        en: ["02", "Provable loop", "Views, clicks, signups, and credits live in an auditable ledger."],
        id: ["02", "Loop bisa dibuktikan", "Views, klik, pendaftaran, dan kredit tercatat di ledger yang bisa diaudit."],
      },
      {
        en: ["03", "Honest about scope", "Test-mode payments are labeled, never faked as live charges."],
        id: ["03", "Jujur soal scope", "Pembayaran test-mode diberi label, tak pernah dipalsukan sebagai transaksi nyata."],
      },
      {
        en: ["04", "Bills in your currency", "Rupiah, ringgit, baht, peso, Singapore and US dollars, euro and pound — never converted behind your back."],
        id: ["04", "Menagih dalam mata uangmu", "Rupiah, ringgit, baht, peso, dolar Singapura dan AS, euro, pound — tidak pernah dikonversi diam-diam."],
      },
    ] as Item[],
  },
  pricing: {
    eyebrow: ["PRICING", "HARGA"] as Pair,
    title: ["Start free. Pay only when you need more.", "Mulai gratis. Bayar hanya saat butuh lebih."] as Pair,
    sub: ["Start with three invoices on us. Need more? Buy a plan or earn them when a client joins through your invoice.", "Tiga invoice pertama gratis. Butuh lebih? Beli paket atau dapatkan tambahan saat klien bergabung lewat invoicemu."] as Pair,
    free: ["Free", "Gratis"] as Pair, freePrice: ["$0", "$0"] as Pair, freeDesc: ["Start billing at no cost.", "Mulai menagih tanpa biaya."] as Pair,
    f1: ["3 invoices to publish", "3 invoice untuk diterbitkan"] as Pair, f2: ["+3 more each time a client joins", "+3 lagi tiap ada klien yang ikut"] as Pair, f3: ["Public link + referral CTA", "Link publik + CTA referral"] as Pair,
    starter: ["Starter", "Starter"] as Pair, starterPrice: ["$3", "$3"] as Pair, starterWhen: [" one-time", " sekali bayar"] as Pair, starterDesc: ["For freelancers billing weekly.", "Untuk freelancer aktif menagih tiap minggu."] as Pair,
    starterApprox: ["", "≈ Rp 49.000"] as Pair,
    s1: ["10 invoices, yours to keep", "10 invoice, tanpa masa berlaku"] as Pair, s2: ["PayPal payment", "Pembayaran PayPal"] as Pair, s3: ["Basic analytics", "Analitik dasar"] as Pair,
    pro: ["Pro", "Pro"] as Pair, proPrice: ["$8", "$8"] as Pair, proWhen: [" for 30 days", " untuk 30 hari"] as Pair, proDesc: ["For micro-agencies and high volume.", "Untuk micro-agency dan volume tinggi."] as Pair,
    proApprox: ["", "≈ Rp 131.000"] as Pair,
    p1: ["50 invoices within 30 days", "50 invoice dalam 30 hari"] as Pair, p2: ["Advanced analytics", "Analitik lanjutan"] as Pair, p3: ["Custom branding", "Branding khusus"] as Pair,
    ctaStart: ["Start", "Mulai"] as Pair, ctaContact: ["Contact us", "Hubungi kami"] as Pair, ctaUpgrade: ["Upgrade", "Upgrade"] as Pair,
    creditLine: ["1 credit = 1 published invoice.", "1 kredit = 1 invoice yang diterbitkan."] as Pair,
    noRenew: [
      "You pay once. Nothing renews by itself, and there is no card kept on file — when a plan runs out you are simply back on free credits.",
      "Bayar sekali. Tidak ada perpanjangan otomatis dan tidak ada kartu yang disimpan — saat paket habis, kamu kembali memakai kredit gratis.",
    ] as Pair,
    note: [
      "Plans are paid in USD by PayPal or card; the rupiah figure is an estimate. Payments currently run in the PayPal sandbox, so no real money is charged.",
      "Paket dibayar dalam USD lewat PayPal atau kartu; angka rupiah adalah perkiraan. Saat ini pembayaran berjalan di PayPal Sandbox, jadi tidak ada uang asli yang ditarik.",
    ] as Pair,
  },
  faq: {
    title: ["Questions people actually ask.", "Pertanyaan yang sering ditanyakan."] as Pair,
    items: [
      {
        en: ["01", "What exactly is a credit?", "One credit publishes one invoice. You get 3 when you sign up, so your first 3 invoices cost nothing. Credits never expire."],
        id: ["01", "Kredit itu apa sih?", "Satu kredit dipakai untuk menerbitkan satu invoice. Kamu dapat 3 saat daftar, jadi 3 invoice pertama gratis. Kredit tidak hangus."],
      },
      {
        en: ["02", "Does my client need an account?", "No. They open the link, see the invoice, and pay. Nothing to install, nothing to sign up for."],
        id: ["02", "Klien saya harus punya akun?", "Tidak. Klien tinggal buka link, lihat tagihannya, lalu bayar. Tidak perlu install atau daftar apa pun."],
      },
      {
        en: ["03", "How do I actually get more credits?", "Each invoice carries a small invitation. If your client signs up through it, you get +3 credits and they get +2 on top of their own 3."],
        id: ["03", "Cara nambah kreditnya gimana?", "Tiap invoice membawa ajakan kecil. Kalau klienmu mendaftar lewat situ, kamu dapat +3 kredit dan dia dapat +2 di atas 3 kredit miliknya."],
      },
      {
        en: ["04", "Where does the money land?", "Straight into your own PayPal account — you save its address in your profile and the invoice is addressed to it. Involoop never holds your money and never stores card details."],
        id: ["04", "Uangnya masuk ke mana?", "Langsung ke akun PayPal milikmu — alamatnya kamu simpan di profil, dan invoice ditujukan ke sana. Involoop tidak pernah menahan uangmu dan tidak menyimpan data kartu."],
      },
      {
        en: ["05", "Can I still use bank transfer?", "Yes. Every invoice offers a manual transfer option: your client confirms they sent it, and you verify it from your dashboard."],
        id: ["05", "Masih bisa transfer bank?", "Bisa. Setiap invoice punya opsi transfer manual: klien konfirmasi sudah transfer, lalu kamu verifikasi dari dashboard."],
      },
      {
        en: ["06", "Is this real money right now?", "Not yet. Payments run in the PayPal sandbox while we finish verification, and every payment screen says so plainly."],
        id: ["06", "Sekarang uangnya beneran?", "Belum. Pembayaran masih berjalan di PayPal Sandbox selama proses verifikasi, dan tiap halaman pembayaran menyebutkannya terang-terangan."],
      },
    ] as Item[],
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

/* ---- App pages (login, signup, dashboard, invoice, payment) ---- */

type T = readonly [string, string];

export const app = {
  nav: {
    dashboard: ["Dashboard", "Dashboard"] as T,
    logout: ["Log out", "Keluar"] as T,
    console: ["Operator console", "Konsol operator"] as T,
    createInvoice: ["+ Create invoice", "+ Buat invoice"] as T,
  },
  common: {
    retry: ["Try again", "Coba lagi"] as T,
    copy: ["Copy", "Salin"] as T,
    copied: ["Copied", "Tersalin"] as T,
    copyLink: ["Copy link", "Salin link"] as T,
    copyCode: ["Copy code", "Salin kode"] as T,
    copiedCode: ["Copied", "Tersalin"] as T,
    sendWhatsapp: ["Send via WhatsApp →", "Kirim via WhatsApp →"] as T,
    viewDashboard: ["View dashboard", "Lihat dashboard"] as T,
    back: ["← Dashboard", "← Dashboard"] as T,
    madeWith: ["Made with Involoop, invoices that bring your next user", "Dibuat dengan Involoop, invoice yang mendatangkan pengguna berikutnya"] as T,
    loading: ["Loading…", "Memuat…"] as T,
  },
  status: {
    paid: ["Paid", "Lunas"] as T,
    awaiting: ["Awaiting verification", "Menunggu verifikasi"] as T,
    pending: ["Payment in progress", "Pembayaran diproses"] as T,
    failed: ["Failed", "Gagal"] as T,
    unpaid: ["Unpaid", "Belum dibayar"] as T,
  },
  login: {
    title: ["Sign in to Involoop", "Masuk ke Involoop"] as T,
    sub: ["Welcome back.", "Selamat datang kembali."] as T,
    continueGoogle: ["Continue with Google", "Lanjut dengan Google"] as T,
    orEmail: ["or sign in with email", "atau masuk dengan email"] as T,
    email: ["Email", "Email"] as T,
    password: ["Password", "Kata sandi"] as T,
    emailPlaceholder: ["you@email.com", "kamu@email.com"] as T,
    passwordPlaceholder: ["Your password", "Kata sandi kamu"] as T,
    signingIn: ["Signing in…", "Memproses…"] as T,
    signIn: ["Sign in", "Masuk"] as T,
    wrongCreds: ["Wrong email or password.", "Email atau kata sandi salah."] as T,
    oauthFail: ["Could not start sign in. Try again.", "Gagal memulai login. Coba lagi."] as T,
    noAccount: ["No account?", "Belum punya akun?"] as T,
    createOne: ["Create one", "Daftar"] as T,
    payAfter: ["payment opens right after sign-in.", "pembayaran langsung dibuka setelah masuk."] as T,
    toCreate: [
      "Sign in to write your invoice — we'll take you straight to it.",
      "Masuk dulu untuk menulis invoicemu — kami langsung antar ke sana.",
    ] as T,
    toContinue: [
      "Sign in to continue where you left off.",
      "Masuk dulu untuk lanjut dari tempat kamu tadi.",
    ] as T,
  },
  signup: {
    title: ["Create your account", "Buat akun kamu"] as T,
    sub: ["3 free credits to publish your first invoices.", "3 kredit gratis untuk menerbitkan invoice pertamamu."] as T,
    invited: [
      "You were invited through a friend's invoice, they earn credits and you get bonus credits when you sign up.",
      "Kamu diundang lewat invoice temanmu, mereka dapat kredit dan kamu dapat bonus kredit saat mendaftar.",
    ] as T,
    continueGoogle: ["Continue with Google", "Lanjut dengan Google"] as T,
    orEmail: ["or sign up with email", "atau daftar dengan email"] as T,
    fullName: ["Full name", "Nama lengkap"] as T,
    fullNamePlaceholder: ["e.g. Budi Santoso", "cth. Budi Santoso"] as T,
    email: ["Email", "Email"] as T,
    password: ["Password", "Kata sandi"] as T,
    emailPlaceholder: ["you@email.com", "kamu@email.com"] as T,
    passwordPlaceholder: ["At least 6 characters", "Minimal 6 karakter"] as T,
    shortPassword: ["Password must be at least 6 characters.", "Kata sandi minimal 6 karakter."] as T,
    signupFail: ["Signup failed. Please try again.", "Pendaftaran gagal. Coba lagi."] as T,
    createdSignIn: ["Account created. Please sign in.", "Akun berhasil dibuat. Silakan masuk."] as T,
    signingUp: ["Signing up…", "Mendaftar…"] as T,
    createAccount: ["Create account", "Buat akun"] as T,
    haveAccount: ["Already have an account?", "Sudah punya akun?"] as T,
    signIn: ["Sign in", "Masuk"] as T,
  },
  dashboard: {
    greeting: ["Hello,", "Halo,"] as T,
    creditsLeft: ["free credits left", "kredit gratis tersisa"] as T,
    credit: ["Your credits", "Kredit kamu"] as T,
    views: ["Invoice views", "Tampilan invoice"] as T,
    clicks: ["Referral CTA clicks", "Klik ajakan referral"] as T,
    referrals: ["Successful referrals", "Referral berhasil"] as T,
    conversion: ["Conversion", "Konversi"] as T,
    creditsEarned: ["Credits earned", "Kredit didapat"] as T,
    invoiceList: ["Invoices", "Invoice"] as T,
    paidCount: ["Paid", "Lunas"] as T,
    awaitingCount: ["Awaiting", "Menunggu"] as T,
    unpaidCount: ["Unpaid", "Belum bayar"] as T,
    emptyTitle: ["START HERE", "MULAI DARI SINI"] as T,
    emptyBody: [
      "No invoices yet. Publish the first one, free with your credits.",
      "Belum ada invoice. Terbitkan yang pertama, gratis pakai kreditmu.",
    ] as T,
    viewsCount: ["views", "tampilan"] as T,
    verify: ["Verify", "Verifikasi"] as T,
    sendWhatsapp: ["Send via WA", "Kirim WA"] as T,

    // Invoice detail modal
    openDetail: ["Open", "Buka"] as T,
    detailTitle: ["Invoice detail", "Detail invoice"] as T,
    detailClose: ["Close", "Tutup"] as T,
    detailBilledTo: ["Billed to", "Ditagihkan ke"] as T,
    detailWork: ["Work", "Pekerjaan"] as T,
    detailAmount: ["Amount", "Nominal"] as T,
    detailDue: ["Due date", "Jatuh tempo"] as T,
    detailNoDue: ["No due date", "Tanpa jatuh tempo"] as T,
    detailIssued: ["Issued", "Terbit"] as T,
    detailClicks: ["Referral clicks", "Klik referral"] as T,
    detailReferralLine: ["Referral invitation on this invoice", "Ajakan referral di invoice ini"] as T,
    detailOpenPublic: ["Open client view", "Lihat versi klien"] as T,
    detailPdf: ["Download PDF", "Unduh PDF"] as T,
    detailEdit: ["Edit", "Ubah"] as T,
    detailDelete: ["Delete", "Hapus"] as T,
    detailCancel: ["Cancel", "Batal"] as T,
    detailSave: ["Save changes", "Simpan perubahan"] as T,
    detailSaving: ["Saving…", "Menyimpan…"] as T,
    detailSaved: ["Saved", "Tersimpan"] as T,
    detailClient: ["Client name", "Nama klien"] as T,
    detailDescription: ["Description", "Deskripsi"] as T,
    detailCurrency: ["Currency", "Mata uang"] as T,
    detailLockedPaid: [
      "This invoice is paid, so it is locked. The amount on a paid invoice is the record of money you received.",
      "Invoice ini sudah lunas, jadi terkunci. Nominal di invoice lunas adalah bukti uang yang kamu terima.",
    ] as T,
    detailLockedActive: [
      "Your client has already acted on this invoice, so the amount is locked. Delete it and send a new one if the figure was wrong.",
      "Klienmu sudah menindaklanjuti invoice ini, jadi nominalnya terkunci. Hapus dan kirim baru kalau angkanya salah.",
    ] as T,
    detailDeleteAsk: ["Delete this invoice?", "Hapus invoice ini?"] as T,
    detailDeleteBody: [
      "The link stops working for your client immediately. Views and referral clicks recorded on it disappear from your stats. Credits your referrals already earned stay yours.",
      "Link langsung mati untuk klienmu. Tampilan dan klik referral di invoice ini hilang dari statistikmu. Kredit dari referral yang sudah masuk tetap milikmu.",
    ] as T,
    detailDeleteCredit: [
      "The publishing credit is not returned — this invoice was already live. To fix a mistake, edit it instead.",
      "Kredit publikasi tidak kembali — invoice ini sudah pernah tayang. Untuk memperbaiki kesalahan, gunakan Ubah.",
    ] as T,
    detailDeleteConfirm: ["Yes, delete it", "Ya, hapus"] as T,
    detailDeleting: ["Deleting…", "Menghapus…"] as T,
    detailDeleted: ["Invoice deleted.", "Invoice dihapus."] as T,
    detailPaidLocked: [
      "Paid invoices cannot be deleted.",
      "Invoice lunas tidak bisa dihapus.",
    ] as T,
    referralSection: ["Referral program", "Program referral"] as T,
    referralCodeHint: [
      "Nothing to share manually: every invoice link already carries your referral. When a client signs up through one, you get +3 credits and they get +2. This code is only your internal reference.",
      "Tidak perlu dibagikan manual: tiap link invoice sudah membawa referralmu. Saat klien mendaftar lewat link itu, kamu dapat +3 kredit dan dia dapat +2. Kode ini hanya referensi internalmu.",
    ] as T,
    referralEmpty: [
      "No referrals yet. The CTA on each invoice invites your clients to join.",
      "Belum ada referral. CTA di tiap invoice yang mengajak klienmu daftar.",
    ] as T,
    newUser: ["New user", "Pengguna baru"] as T,
    credits: ["credits", "kredit"] as T,
    creditHistory: ["Credit history", "Riwayat kredit"] as T,
    creditHistoryEmpty: ["No credit activity yet.", "Belum ada pergerakan kredit."] as T,
    paymentSettings: ["Payment settings", "Pengaturan pembayaran"] as T,
    connected: ["Connected", "Terhubung"] as T,
    notConnected: ["Not connected", "Belum terhubung"] as T,
    provider: ["Payment provider", "Penyedia pembayaran"] as T,
    payoutAddress: ["Your PayPal address", "Alamat PayPal-mu"] as T,
    mode: ["Mode", "Mode"] as T,
    testMode: ["Test Mode", "Test Mode"] as T,
    defaultCurrency: ["Default settlement currency", "Mata uang default"] as T,
    sandboxBadge: ["PayPal Sandbox, no real money will be charged", "PayPal Sandbox, tidak ada uang asli yang ditarik"] as T,
    savePaypal: ["Save PayPal address", "Simpan alamat PayPal"] as T,
    loadFailed: ["Failed to load dashboard.", "Gagal memuat dashboard."] as T,
    notLoggedIn: ["Not logged in. Sign up or sign in first.", "Belum login. Daftar / masuk dulu."] as T,
    copyFailed: ["Could not copy link.", "Gagal menyalin link."] as T,
    verifyFailed: ["Verification failed.", "Gagal verifikasi."] as T,
    connectFailed: ["Could not save your PayPal address.", "Gagal menyimpan alamat PayPal."] as T,
    resetConfirm: ["Reset all data for this demo account?", "Reset seluruh data akun demo ini?"] as T,
    resetFailed: ["Reset failed.", "Gagal reset."] as T,
    demoWorkspace: ["Demo workspace", "Demo workspace"] as T,
    demoWorkspaceHint: [
      "Reset invoices, payments, referrals, ledger, and credits for a clean presentation.",
      "Reset invoice, pembayaran, referral, ledger, dan kredit untuk presentasi yang bersih.",
    ] as T,
    resetting: ["Resetting…", "Reset…"] as T,
    resetWorkspace: ["Reset Demo Workspace", "Reset Demo Workspace"] as T,
    currentPlan: ["Plan", "Paket"] as T,
    planFree: ["Free", "Gratis"] as T,
    planStarter: ["Starter", "Starter"] as T,
    planPro: ["Pro", "Pro"] as T,
    upgrade: ["Upgrade", "Upgrade"] as T,
    upgraded: ["Plan upgraded!", "Paket berhasil di-upgrade!"] as T,
    planLeft: ["invoices left · {used} of {quota} used", "invoice tersisa · {used} dari {quota} terpakai"] as T,
    planUntil: ["Active until", "Aktif sampai"] as T,
    planPlusCredits: ["Plus {n} referral credits, kept for when your plan ends.", "Plus {n} kredit referral, disimpan untuk saat paketmu habis."] as T,
    planEnded: ["Your paid period has ended. You are back on referral credits.", "Masa berbayarmu sudah berakhir. Kamu kembali memakai kredit referral."] as T,
    planGet: ["Get", "Ambil"] as T,
    suspendedTitle: ["Your account is suspended", "Akunmu ditangguhkan"] as T,
    suspendedBody: [
      "You cannot publish new invoices. Invoices you already sent stay payable. Contact support to have this reviewed.",
      "Kamu tidak bisa menerbitkan invoice baru. Invoice yang sudah terkirim tetap bisa dibayar. Hubungi dukungan untuk peninjauan.",
    ] as T,
    pendingPlanTitle: ["You chose {plan} — not paid yet", "Kamu memilih {plan} — belum dibayar"] as T,
    pendingPlanBody: [
      "Your account is still running on free credits. Finish the payment and the invoices are added straight away.",
      "Akunmu masih memakai kredit gratis. Selesaikan pembayaran dan kuota invoice langsung ditambahkan.",
    ] as T,
    pendingPlanCta: ["Finish payment", "Selesaikan pembayaran"] as T,
    pendingPlanDismiss: ["Not now", "Nanti saja"] as T,
    payUsdc: ["Pay with USDC", "Bayar dengan USDC"] as T,
    payUsdcSub: ["A digital dollar. 1 USDC = $1, sent from a crypto wallet.", "Dolar digital. 1 USDC = $1, dikirim dari wallet crypto."] as T,
    payUsdcBack: ["Use PayPal or card instead", "Pakai PayPal atau kartu saja"] as T,
    upgradeTitle: ["Upgrade plan", "Naikkan paket"] as T,
    upgradePrice: ["One-time payment", "Bayar sekali"] as T,
    upgradeIncludes: ["Includes {n} public invoices", "Termasuk {n} invoice publik"] as T,
    upgradeFailed: ["Could not start upgrade. Try again.", "Gagal memulai upgrade. Coba lagi."] as T,
    attentionCount: ["invoices need you", "invoice menunggumu"] as T,
    attentionBody: [
      "Your client says they sent the transfer. Check your account, then confirm it.",
      "Klienmu bilang sudah transfer. Cek rekeningmu, lalu konfirmasi.",
    ] as T,
    attentionGo: ["Show them", "Lihat"] as T,
    filterAll: ["All", "Semua"] as T,
    filterUnpaid: ["Unpaid", "Belum bayar"] as T,
    filterAwaiting: ["Awaiting", "Menunggu"] as T,
    filterPaid: ["Paid", "Lunas"] as T,
    moneyTitle: ["Your money", "Uang kamu"] as T,
    moneyOutstanding: ["Waiting to be paid", "Menunggu dibayar"] as T,
    moneyReceived: ["Received", "Sudah diterima"] as T,
    moneyBilled: ["Billed in total", "Total ditagihkan"] as T,
    moneyEmpty: ["Publish an invoice and the totals show up here.", "Terbitkan invoice, totalnya akan muncul di sini."] as T,
    moneySettled: ["Received", "Sudah diterima"] as T,
    tabOverview: ["Overview", "Ringkasan"] as T,
    tabInvoices: ["Invoices", "Invoice"] as T,
    tabLoop: ["Loop", "Loop"] as T,
    chartTitle: ["Billed, last 7 days", "Ditagihkan, 7 hari terakhir"] as T,
    splitTitle: ["Invoice status", "Status invoice"] as T,
    seeAll: ["See all →", "Lihat semua →"] as T,
    moneyAllPaid: ["Nothing outstanding", "Tidak ada tagihan tertunggak"] as T,
    creditIsInvoice: ["1 credit = 1 invoice", "1 kredit = 1 invoice"] as T,
    growthTitle: ["Your loop", "Loop kamu"] as T,
    setupTitle: ["Finish one step so clients can pay you", "Selesaikan satu langkah agar klien bisa membayar"] as T,
    setupBody: [
      "Save your PayPal address and every invoice you send gets a Pay button that pays you directly. Until then, clients can only confirm a manual transfer.",
      "Simpan alamat PayPal-mu supaya tiap invoice punya tombol Bayar yang langsung masuk ke kamu. Sebelum itu, klien hanya bisa konfirmasi transfer manual.",
    ] as T,
    setupDone: ["Clients can pay your invoices online.", "Klien sudah bisa membayar invoicemu secara online."] as T,
    signIn: ["Sign in", "Masuk"] as T,
    signUp: ["Create a free account", "Buat akun gratis"] as T,
  },
  profile: {
    title: ["Your profile", "Profil kamu"] as T,
    sub: [
      "The name here is what your clients see. Everything else is for you.",
      "Nama di sini yang dilihat klienmu. Sisanya untuk kamu sendiri.",
    ] as T,
    nameTitle: ["Name on your invoices", "Nama di invoicemu"] as T,
    nameHint: [
      "This is the letterhead on every invoice and every PDF you send — your name, or your studio's.",
      "Ini kop surat di setiap invoice dan PDF yang kamu kirim — namamu, atau nama studiomu.",
    ] as T,
    nameLabel: ["Display name", "Nama tampilan"] as T,
    previewLabel: ["ON THE INVOICE", "DI INVOICE"] as T,
    previewEmpty: ["Your name here", "Namamu di sini"] as T,
    save: ["Save name", "Simpan nama"] as T,
    saving: ["Saving…", "Menyimpan…"] as T,
    saved: ["Saved. New invoices will use it.", "Tersimpan. Invoice baru akan memakainya."] as T,
    saveFailed: ["Could not save. Try again.", "Gagal menyimpan. Coba lagi."] as T,
    loadFailed: ["Could not load your profile.", "Gagal memuat profil."] as T,
    accountTitle: ["Account", "Akun"] as T,
    email: ["Email", "Email"] as T,
    joined: ["Joined", "Bergabung"] as T,
    paypalLabel: ["PayPal address for payments", "Alamat PayPal untuk pembayaran"] as T,
    paypalOn: [
      "Clients will see a Pay with PayPal button, and the money goes straight to this account — Involoop never holds it.",
      "Klien akan melihat tombol Bayar dengan PayPal, dan uangnya langsung masuk ke akun ini — Involoop tidak pernah menahannya.",
    ] as T,
    paypalOff: [
      "Leave this empty and your invoices only offer bank transfer confirmation. Paste the address your PayPal account uses.",
      "Kalau dikosongkan, invoice-mu hanya menawarkan konfirmasi transfer bank. Tempel alamat yang dipakai akun PayPal-mu.",
    ] as T,
    walletTitle: ["Solana wallet", "Wallet Solana"] as T,
    walletHint: [
      "Connect a wallet and your USD invoices can also be paid in USDC. The money goes straight from your client to this address — Involoop never holds it.",
      "Hubungkan wallet dan invoice USD-mu juga bisa dibayar pakai USDC. Uangnya langsung dari klien ke alamat ini — Involoop tidak pernah menahannya.",
    ] as T,
    walletConnect: ["Connect wallet", "Hubungkan wallet"] as T,
    walletChange: ["Use a different wallet", "Ganti wallet"] as T,
    walletConnecting: ["Waiting for your wallet…", "Menunggu wallet…"] as T,
    walletConnected: ["Connected wallet", "Wallet terhubung"] as T,
    walletNone: [
      "No Solana wallet found in this browser. Install Phantom, Solflare or Backpack, then try again.",
      "Tidak ada wallet Solana di browser ini. Pasang Phantom, Solflare, atau Backpack, lalu coba lagi.",
    ] as T,
    walletWarning: [
      "You will be asked to sign a message. It proves you control the address and authorizes no transfer. Involoop will never ask for your recovery phrase or private key.",
      "Kamu akan diminta menandatangani sebuah pesan. Itu hanya membuktikan alamat ini milikmu dan tidak mengizinkan transfer apa pun. Involoop tidak akan pernah meminta recovery phrase atau private key.",
    ] as T,
    emailHint: [
      "Email cannot be changed here yet — write to hello@involoop.vercel.app and we will move it for you.",
      "Email belum bisa diubah di sini — kirim email ke hello@involoop.vercel.app dan kami pindahkan.",
    ] as T,
    passwordTitle: ["Password", "Kata sandi"] as T,
    passwordLabel: ["New password", "Kata sandi baru"] as T,
    passwordSave: ["Update password", "Ubah kata sandi"] as T,
    passwordDone: ["Password updated.", "Kata sandi diperbarui."] as T,
    passwordFailed: [
      "Could not update the password. Sign in again and retry.",
      "Gagal mengubah kata sandi. Masuk ulang lalu coba lagi.",
    ] as T,
    open: ["Profile", "Profil"] as T,
  },
  legal: {
    updated: ["Last updated", "Terakhir diperbarui"] as T,
    back: ["← Back to Involoop", "← Kembali ke Involoop"] as T,
    privacyTitle: ["Privacy Policy", "Kebijakan Privasi"] as T,
    termsTitle: ["Terms of Service", "Ketentuan Layanan"] as T,
  },
  newInvoice: {
    title: ["Create invoice", "Buat invoice"] as T,
    sub: [
      "Write it in one sentence, let AI compose the invoice.",
      "Tulis dalam satu kalimat, biar AI yang menyusun invoicenya.",
    ] as T,
    step1: ["Write sentence", "Tulis kalimat"] as T,
    step2: ["Review & edit", "Periksa & edit"] as T,
    step3: ["Publish & send", "Terbitkan & kirim"] as T,
    sentenceLabel: ["Your billing sentence", "Kalimat tagihanmu"] as T,
    sentencePlaceholder: [
      "e.g. bill Rina 2 million for a logo design, due in 2 weeks",
      "contoh: tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu",
    ] as T,
    useSample: ["Try one of these:", "Coba salah satu:"] as T,
    draftLoaded: [
      "We brought over the sentence you tried on the home page — edit it or send it as is.",
      "Kalimat yang tadi kamu coba di beranda sudah kami bawa ke sini — boleh diubah atau langsung dipakai.",
    ] as T,
    keyboardHint: ["Press ⌘/Ctrl + Enter", "Tekan ⌘/Ctrl + Enter"] as T,
    composingHint: [
      "Reading who, what, and how much…",
      "Membaca siapa, jasa apa, dan berapa nominalnya…",
    ] as T,
    creditCost: ["Publishing uses 1 credit.", "Menerbitkan memakai 1 kredit."] as T,
    creditsLeft: ["You have {n} left.", "Kreditmu tersisa {n}."] as T,
    noCredits: [
      "You are out of credits. Earn more when a client joins through one of your invoices, or add a plan.",
      "Kreditmu habis. Tambah kredit saat klien bergabung lewat invoicemu, atau ambil paket berbayar.",
    ] as T,
    backToSentence: ["← Change the sentence", "← Ubah kalimatnya"] as T,
    nextTitle: ["What happens next", "Setelah ini"] as T,
    next1: [
      "Your client opens the link. No account, no app to install.",
      "Klienmu tinggal buka link. Tanpa akun, tanpa install aplikasi.",
    ] as T,
    next2: [
      "They pay by card, or confirm they sent a transfer.",
      "Klien bayar pakai kartu, atau konfirmasi sudah transfer.",
    ] as T,
    next3: [
      "You see the status on your dashboard, and earn 3 credits if they sign up.",
      "Kamu lihat statusnya di dashboard, dan dapat 3 kredit kalau klien ikut mendaftar.",
    ] as T,
    composing: ["Composing invoice…", "Menyusun invoice…"] as T,
    createWithAI: ["Create invoice with AI", "Buat invoice dengan AI"] as T,
    fillManual: ["Fill manually instead", "Isi manual saja"] as T,
    needLogin: ["You are not logged in.", "Kamu belum login."] as T,
    aiFailed: [
      "AI could not compose the invoice. Try again, or use the manual form below.",
      "AI gagal menyusun invoice. Coba lagi, atau isi form manual di bawah.",
    ] as T,
    aiResultHint: [
      "✨ AI result, check and edit before publishing.",
      "✨ Hasil AI, periksa dan edit dulu sebelum diterbitkan.",
    ] as T,
    manualHint: ["Fill in the invoice details, then publish.", "Isi detail invoice, lalu terbitkan."] as T,
    clientName: ["Client name", "Nama klien"] as T,
    clientPlaceholder: ["e.g. Rina", "Mis. Rina"] as T,
    description: ["Service description", "Deskripsi jasa"] as T,
    descriptionPlaceholder: ["e.g. Logo design", "Mis. Desain logo"] as T,
    amount: ["Amount", "Nominal"] as T,
    currency: ["Currency", "Currency"] as T,
    dueDate: ["Due date", "Jatuh tempo"] as T,
    ctaLabel: ["Referral message (optional)", "Pesan ajakan (opsional)"] as T,
    ctaPlaceholder: ["Shown on the client invoice page", "Muncul di halaman invoice klien"] as T,
    invalidAmount: ["Invalid amount.", "Nominal tidak valid."] as T,
    publishFailed: ["Could not publish invoice.", "Gagal menerbitkan invoice"] as T,
    publishing: ["Publishing…", "Menerbitkan…"] as T,
    publish: ["Publish invoice", "Terbitkan invoice"] as T,
    preview: ["PREVIEW", "PRATINJAU"] as T,
    draft: ["DRAFT", "DRAFT"] as T,
    previewEmpty: [
      "The invoice preview appears here once you fill in the client name, description, and amount.",
      "Preview invoice muncul di sini setelah kamu melengkapi nama klien, deskripsi, dan nominal.",
    ] as T,
    to: ["TO", "UNTUK"] as T,
    dueOn: ["Due", "Jatuh tempo"] as T,
    published: ["INVOICE PUBLISHED", "INVOICE DITERBITKAN"] as T,
    publishedTitle: ["Invoice ready. Send this link to your client:", "Invoice siap. Kirim link ini ke klienmu:"] as T,
    copyFailed: ["Could not copy. Copy manually from the link below.", "Gagal menyalin. Salin manual dari link di bawah."] as T,
    whatsappText: ["Hi, here is your invoice: ", "Halo, ini tagihan untuk kamu: "] as T,
  },
  invoice: {
    from: ["FROM", "DARI"] as T,
    to: ["TO", "UNTUK"] as T,
    dueDate: ["Due", "Jatuh tempo"] as T,
    paid: ["✓ Payment received", "✓ Pembayaran diterima"] as T,
    awaiting: ["Awaiting sender verification", "Menunggu verifikasi pengirim"] as T,
    pending: ["Payment in progress…", "Pembayaran sedang diproses…"] as T,
    unpaid: ["Unpaid", "Belum dibayar"] as T,
    downloadPdf: ["Download PDF", "Unduh PDF"] as T,
    payPaypal: ["Pay with PayPal", "Bayar dengan PayPal"] as T,
    redirecting: ["Redirecting to PayPal…", "Mengarahkan ke PayPal…"] as T,
    docLabel: ["Invoice", "Invoice"] as T,
    description: ["Description", "Deskripsi"] as T,
    amount: ["Amount", "Jumlah"] as T,
    total: ["Total", "Total"] as T,
    payUsdc: ["Pay with USDC", "Bayar dengan USDC"] as T,
    payUsdcSub: ["A digital dollar. 1 USDC = $1, sent from a crypto wallet.", "Dolar digital. 1 USDC = $1, dikirim dari wallet crypto."] as T,
    payUsdcBack: ["Use another payment method", "Pakai cara bayar lain"] as T,
    cryptoLoading: ["Preparing the payment…", "Menyiapkan pembayaran…"] as T,
    cryptoAmount: ["Send exactly", "Kirim persis"] as T,
    cryptoNetwork: ["Network", "Jaringan"] as T,
    cryptoRecipient: ["To wallet", "Ke wallet"] as T,
    cryptoOpen: ["Open in wallet", "Buka di wallet"] as T,
    cryptoCopyAmount: ["tap to copy", "ketuk untuk salin"] as T,
    cryptoCopyAddress: ["tap to copy", "ketuk untuk salin"] as T,
    cryptoCopied: ["copied", "tersalin"] as T,
    cryptoScan: ["Scan with a Solana wallet on your phone", "Pindai dengan wallet Solana di HP-mu"] as T,
    cryptoFees: [
      "You need USDC for the amount, plus a little SOL for the network fee. Both on this network.",
      "Kamu butuh USDC untuk nominalnya, plus sedikit SOL untuk biaya jaringan. Keduanya di jaringan ini.",
    ] as T,
    cryptoExact: [
      "Send the exact amount. A different amount will not settle automatically.",
      "Kirim nominal persis. Nominal berbeda tidak akan otomatis dianggap lunas.",
    ] as T,
    cryptoWaiting: ["Waiting for payment", "Menunggu pembayaran"] as T,
    cryptoDetected: ["Transaction detected", "Transaksi terdeteksi"] as T,
    cryptoVerifying: ["Confirming on the network", "Dikonfirmasi jaringan"] as T,
    cryptoConfirmed: ["Payment confirmed", "Pembayaran dikonfirmasi"] as T,
    cryptoExpired: [
      "This payment request expired. Start a new one — nothing was charged.",
      "Permintaan pembayaran ini kedaluwarsa. Mulai yang baru — tidak ada yang tertagih.",
    ] as T,
    cryptoRetry: ["Try again", "Coba lagi"] as T,
    cryptoViewTx: ["View transaction", "Lihat transaksi"] as T,
    cryptoExpiresIn: ["Expires in {time}", "Kedaluwarsa dalam {time}"] as T,
    cryptoCheckNow: ["I've sent it — check now", "Sudah kirim — cek sekarang"] as T,
    cryptoUnderpaid: [
      "You sent less than the invoice. Involoop settles a payment only when the full amount arrives in a single transfer. Send {amount} USDC in one transaction, or start a new request.",
      "Kamu mengirim kurang dari tagihan. Involoop hanya mencatat lunas jika jumlah penuh tiba dalam satu transfer. Kirim {amount} USDC dalam satu transaksi, atau mulai permintaan baru.",
    ] as T,
    cryptoMismatch: [
      "A transaction was found, but it does not match this payment request. Start a new request and send the exact amount to the QR shown.",
      "Transaksi ditemukan, tapi tidak cocok dengan permintaan ini. Mulai permintaan baru dan kirim nominal persis ke QR yang ditampilkan.",
    ] as T,
    cryptoNoWallet: [
      "No wallet detected on this device. Install Phantom, or scan the QR with a phone wallet.",
      "Wallet tidak terdeteksi di perangkat ini. Pasang Phantom, atau pindai QR dengan wallet HP.",
    ] as T,
    cryptoOverpaid: [
      "Payment confirmed. You sent {sent} USDC; the invoice was {owed}. The extra arrived with it.",
      "Pembayaran dikonfirmasi. Kamu mengirim {sent} USDC; tagihan {owed}. Kelebihannya ikut terkirim.",
    ] as T,
    cryptoLiveBadge: [
      "Payments are settled on the Solana blockchain.",
      "Pembayaran diselesaikan di blockchain Solana.",
    ] as T,
    payDeclined: [
      "That card was declined by the bank. Pick another card, or pay with your PayPal balance.",
      "Kartu itu ditolak bank. Pilih kartu lain, atau bayar pakai saldo PayPal.",
    ] as T,
    payPending: [
      "PayPal accepted the order but has not confirmed the payment yet. Do not pay twice — refresh this page in a moment to see the result.",
      "PayPal menerima order tapi belum mengonfirmasi pembayarannya. Jangan bayar dua kali — muat ulang halaman ini sebentar lagi untuk melihat hasilnya.",
    ] as T,
    payLoading: ["Loading secure payment…", "Memuat pembayaran aman…"] as T,
    payUnavailable: [
      "Payment buttons could not load. Refresh the page, or use the bank transfer option below.",
      "Tombol pembayaran gagal dimuat. Muat ulang halaman, atau pakai opsi transfer bank di bawah.",
    ] as T,
    payCurrencyUnsupported: [
      "This invoice is in {currency}, which card and PayPal payment does not cover. Pay by bank transfer and confirm below.",
      "Invoice ini dalam {currency}, yang belum dilayani pembayaran kartu maupun PayPal. Bayar lewat transfer bank lalu konfirmasi di bawah.",
    ] as T,
    payHint: [
      "Payment is securely processed by PayPal. You can pay with a PayPal balance or a card, and Involoop never sees either.",
      "Pembayaran diproses aman oleh PayPal. Bisa pakai saldo PayPal atau kartu, dan Involoop tidak pernah melihat keduanya.",
    ] as T,
    orManual: ["or pay by manual transfer", "atau transfer manual"] as T,
    manualTitle: ["Manual transfer", "Transfer manual"] as T,
    manualBody: [
      "Transfer to the account you agreed with {sender}, then confirm below.",
      "Transfer ke rekening yang disepakati dengan {sender}, lalu konfirmasi di bawah.",
    ] as T,
    confirmTransfer: ["I have completed the transfer", "Saya sudah transfer"] as T,
    confirmTransferAsk: [
      "Confirm that you already sent the transfer? The sender will be asked to verify it.",
      "Konfirmasi bahwa kamu sudah mengirim transfer? Pengirim akan diminta memverifikasinya.",
    ] as T,
    awaitingHint: [
      "The sender has been notified and will confirm once the money lands.",
      "Pengirim sudah diberi tahu dan akan mengonfirmasi begitu dananya masuk.",
    ] as T,
    testBadge: [
      "PayPal Sandbox · no real money will be charged",
      "PayPal Sandbox · tidak ada uang asli yang ditarik",
    ] as T,
    // With two rails on the page, naming only one leaves the other unlabelled —
    // and an unlabelled payment method on a test system is the one someone
    // assumes is real.
    testBadgeBoth: [
      "Test mode · PayPal Sandbox and Solana Devnet · no real money will be charged",
      "Mode uji · PayPal Sandbox dan Solana Devnet · tidak ada uang asli yang ditarik",
    ] as T,
    sending: ["Sending confirmation…", "Mengirim konfirmasi…"] as T,
    checkoutFailed: ["Could not create payment session.", "Gagal membuat sesi pembayaran."] as T,
    confirmFailed: ["Something went wrong. Try again.", "Terjadi kesalahan. Coba lagi."] as T,
    referralHeading: ["Create an invoice like this, free", "Buat invoice seperti ini, gratis"] as T,
    referralBody: ["{cta}", "{cta}"] as T,
    referralCta: [
      "Get 5 free credits when you join through this invoice →",
      "Dapatkan 5 kredit gratis saat kamu bergabung lewat invoice ini →",
    ] as T,
    notFound: ["Invoice not found.", "Invoice tidak ditemukan."] as T,
    loading: ["Loading…", "Memuat…"] as T,
  },
  success: {
    missingSession: ["Missing payment session.", "Sesi pembayaran tidak ditemukan."] as T,
    notFound: ["Payment session not found.", "Sesi pembayaran tidak ditemukan."] as T,
    unknownTitle: ["Payment status unknown", "Status pembayaran tidak diketahui"] as T,
    back: ["Back to Involoop", "Kembali ke Involoop"] as T,
    successful: ["Payment successful ✓", "Pembayaran berhasil ✓"] as T,
    invoiceLabel: ["Invoice", "Invoice"] as T,
    verifiedBy: ["Payment verified by PayPal", "Pembayaran diverifikasi oleh PayPal"] as T,
    pendingTitle: ["Payment not confirmed yet", "Pembayaran belum dikonfirmasi"] as T,
    pendingBody: [
      "PayPal has the order but has not confirmed that the money moved. Nothing has been charged twice. Refresh in a moment, or open the invoice again to finish paying.",
      "PayPal sudah menerima order tapi belum mengonfirmasi uangnya berpindah. Tidak ada yang tertagih dua kali. Muat ulang sebentar lagi, atau buka invoice-nya lagi untuk menyelesaikan pembayaran.",
    ] as T,
    failedTitle: ["Payment did not go through", "Pembayaran tidak berhasil"] as T,
    failedBody: [
      "The payment was not completed, and nothing was charged. Open the invoice to try another card or your PayPal balance.",
      "Pembayaran tidak selesai dan tidak ada yang tertagih. Buka invoice-nya untuk mencoba kartu lain atau saldo PayPal.",
    ] as T,
    openInvoice: ["Open the invoice", "Buka invoice"] as T,
    downloadPdf: ["Download PDF receipt", "Unduh bukti PDF"] as T,
    refresh: ["Refresh", "Muat ulang"] as T,
    transactionId: ["Transaction ID:", "ID Transaksi:"] as T,
    paidAt: ["Paid at:", "Dibayar pada:"] as T,
    referralHeading: ["Create your own invoice, get free credits", "Buat invoice-mu sendiri, dapatkan kredit gratis"] as T,
    referralBody: [
      "Join through this invoice and receive credits to publish your first invoices.",
      "Bergabung lewat invoice ini dan dapatkan kredit untuk menerbitkan invoice pertamamu.",
    ] as T,
    referralCta: ["Create your own invoice →", "Buat invoice sendiri →"] as T,
  },
} as const;

export function appText(lang: Lang, key: string, vars?: Record<string, string>): string {
  const parts = key.split(".");
  let node: any = app;
  for (const part of parts) node = node?.[part];
  if (!node || typeof node === "string") return key;
  const idx = lang === "en" ? 0 : 1;
  const val = node[idx];
  if (typeof val !== "string") return key;
  if (!vars) return val;
  return val.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}

// `useLang` now lives in components/LangProvider.tsx: the language is resolved
// on the server from the cookie and passed down, so no page has to guess it
// after hydration.

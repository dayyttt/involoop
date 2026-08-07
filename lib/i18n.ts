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
    note: ["No credit card required · Start free in 30 seconds", "Tanpa kartu kredit · Mulai gratis dalam 30 detik"] as Pair,
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
  testimonials: {
    eyebrow: ["REAL FREELANCERS", "FREELANCER ASLI"] as Pair,
    title: ["Invoices that quietly bring clients.", "Tagihan yang diam-diam mendatangkan klien."] as Pair,
    sub: ["People bill every week anyway. The only difference is where the invoice goes.", "Mereka menagih setiap minggu. Bedanya cuma ke mana tagihan itu mengalir."] as Pair,
    items: [
      {
        en: ["Rani Kusuma", "Branding Designer · Jakarta", "I used to send manual PDFs and forget to follow up. Now one sentence becomes a link my client can pay from — and two clients ended up signing up themselves."],
        id: ["Rani Kusuma", "Desainer Branding · Jakarta", "Dulu kirim PDF manual dan lupa menindaklanjuti. Sekarang satu kalimat jadi link yang bisa dibayar klien — dan dua klien akhirnya ikut mendaftar sendiri."],
      },
      {
        en: ["Dimas Pradana", "Web Developer · micro-agency 2 people", "I doubted an invoice could bring referrals. Three months in, four new clients came from invoices I was sending anyway."],
        id: ["Dimas Pradana", "Web Developer · micro-agency 2 orang", "Awalnya ragu invoice bisa mendatangkan referral. Tiga bulan, empat klien baru datang dari tagihan yang memang rutin saya kirim."],
      },
      {
        en: ["Aulia Rahman", "Marketing Consultant · Bandung", "What I like: everything is visible. Views, clicks, who signed up, credits landing. I can show the result — not just promise it."],
        id: ["Aulia Rahman", "Konsultan Pemasaran · Bandung", "Yang saya suka: semuanya ketahuan. Views, klik, siapa yang daftar, kredit yang masuk. Saya bisa tunjukkan hasilnya, bukan sekadar janji."],
      },
    ] as Item[],
  },
  trust: {
    eyebrow: ["TRUST & SECURITY", "KEPERCAYAAN & KEAMANAN"] as Pair,
    title: ["Built to be checked.", "Dibangun supaya bisa diperiksa."] as Pair,
    sub: ["No vague marketing promises. The loop is provable from your own dashboard.", "Tanpa janji pemasaran yang kabur. Loop bisa dibuktikan dari dashboard-mu sendiri."] as Pair,
    items: [
      {
        en: ["01", "Secure payments", "Stripe processes payment; Involoop never stores card data."],
        id: ["01", "Pembayaran aman", "Stripe yang memproses; Involoop tidak pernah menyimpan data kartu."],
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
        en: ["04", "Built for Indonesia", "English and Indonesian, with IDR pricing that matches reality."],
        id: ["04", "Dibuat untuk Indonesia", "Inggris dan Indonesia, dengan harga IDR yang sesuai kenyataan."],
      },
    ] as Item[],
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
    ctaStart: ["Start", "Mulai"] as Pair, ctaContact: ["Contact us", "Hubungi kami"] as Pair, ctaUpgrade: ["Upgrade", "Upgrade"] as Pair,
    note: ["Payments run in Stripe test mode — no real money is charged.", "Pembayaran berjalan di Stripe Test Mode — tidak ada uang asli yang ditarik."] as Pair,
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
    madeWith: ["Made with Involoop · invoices that bring your next user", "Dibuat dengan Involoop · invoice yang mendatangkan pengguna berikutnya"] as T,
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
  },
  signup: {
    title: ["Create your account", "Buat akun kamu"] as T,
    sub: ["3 free credits to publish your first invoices.", "3 kredit gratis untuk menerbitkan invoice pertamamu."] as T,
    invited: [
      "You were invited through a friend's invoice — they earn credits and you get bonus credits when you sign up.",
      "Kamu diundang lewat invoice temanmu — mereka dapat kredit dan kamu dapat bonus kredit saat mendaftar.",
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
      "No invoices yet. Publish the first one — free with your credits.",
      "Belum ada invoice. Terbitkan yang pertama — gratis pakai kreditmu.",
    ] as T,
    viewsCount: ["views", "tampilan"] as T,
    verify: ["Verify", "Verifikasi"] as T,
    sendWhatsapp: ["Send via WA", "Kirim WA"] as T,
    referralSection: ["Referral program", "Program referral"] as T,
    referralCodeHint: [
      "This code is used when a friend signs up through your invoice link — each successful referral earns +5 credits.",
      "Kode ini dipakai saat temanmu mendaftar lewat link invoicemu — setiap referral sukses memberi +5 kredit.",
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
    connectionStatus: ["Connection status", "Status koneksi"] as T,
    mode: ["Mode", "Mode"] as T,
    testMode: ["Test Mode", "Test Mode"] as T,
    defaultCurrency: ["Default settlement currency", "Mata uang default"] as T,
    stripeTestBadge: ["Stripe Test Mode — no real money will be charged", "Stripe Test Mode — tidak ada uang asli yang ditarik"] as T,
    connectStripe: ["Connect Stripe", "Hubungkan Stripe"] as T,
    connecting: ["Connecting…", "Menghubungkan…"] as T,
    loadFailed: ["Failed to load dashboard.", "Gagal memuat dashboard."] as T,
    notLoggedIn: ["Not logged in. Sign up or sign in first.", "Belum login. Daftar / masuk dulu."] as T,
    copyFailed: ["Could not copy link.", "Gagal menyalin link."] as T,
    verifyFailed: ["Verification failed.", "Gagal verifikasi."] as T,
    connectFailed: ["Could not connect Stripe.", "Gagal menghubungkan Stripe."] as T,
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
    upgradeFailed: ["Could not start upgrade. Try again.", "Gagal memulai upgrade. Coba lagi."] as T,
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
    useSample: ["Use sample →", "Pakai contoh →"] as T,
    composing: ["Composing invoice…", "Menyusun invoice…"] as T,
    createWithAI: ["Create invoice with AI", "Buat invoice dengan AI"] as T,
    fillManual: ["Fill manually instead", "Isi manual saja"] as T,
    needLogin: ["You are not logged in.", "Kamu belum login."] as T,
    aiFailed: [
      "AI could not compose the invoice. Try again, or use the manual form below.",
      "AI gagal menyusun invoice. Coba lagi, atau isi form manual di bawah.",
    ] as T,
    aiResultHint: [
      "✨ AI result — check and edit before publishing.",
      "✨ Hasil AI — periksa dan edit dulu sebelum diterbitkan.",
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
    payStripe: ["Pay with Stripe", "Bayar dengan Stripe"] as T,
    redirecting: ["Redirecting to Stripe…", "Mengarahkan ke Stripe…"] as T,
    stripeHint: [
      "Payment is securely processed by Stripe. Involoop does not store card information.",
      "Pembayaran diproses aman oleh Stripe. Involoop tidak menyimpan data kartu.",
    ] as T,
    orManual: ["or pay by manual transfer", "atau transfer manual"] as T,
    manualTitle: ["Manual transfer", "Transfer manual"] as T,
    manualBody: [
      "Transfer to the account you agreed with {sender}, then confirm below.",
      "Transfer ke rekening yang disepakati dengan {sender}, lalu konfirmasi di bawah.",
    ] as T,
    confirmTransfer: ["I have completed the transfer", "Saya sudah transfer"] as T,
    sending: ["Sending confirmation…", "Mengirim konfirmasi…"] as T,
    checkoutFailed: ["Could not create payment session.", "Gagal membuat sesi pembayaran."] as T,
    confirmFailed: ["Something went wrong. Try again.", "Terjadi kesalahan. Coba lagi."] as T,
    referralHeading: ["Create an invoice like this — free", "Buat invoice seperti ini — gratis"] as T,
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
    verifiedBy: ["Payment verified by Stripe", "Pembayaran diverifikasi oleh Stripe"] as T,
    transactionId: ["Transaction ID:", "ID Transaksi:"] as T,
    paidAt: ["Paid at:", "Dibayar pada:"] as T,
    referralHeading: ["Create your own invoice — get free credits", "Buat invoice-mu sendiri — dapatkan kredit gratis"] as T,
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

import { useEffect, useState } from "react";

export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    setLang(getInitialLang());
  }, []);
  return lang;
}

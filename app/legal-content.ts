import type { Lang } from "@/lib/i18n";

type Section = { heading: string; body: string[] };
type Doc = { title: string; intro: string; sections: Section[] };

export const LEGAL_UPDATED = "2026-08-07";

// Plain-language documents describing what the product actually does today:
// Supabase for accounts, Stripe for payments, an AI provider for the parsing
// step, and a Stripe test mode that charges nobody. Written to be reviewed
// before any real-money launch, not to sound like a law firm.
const privacy: Record<Lang, Doc> = {
  en: {
    title: "Privacy Policy",
    intro:
      "This policy explains what Involoop stores, why, and what you can ask us to delete. It covers the product as it works today.",
    sections: [
      {
        heading: "What we store",
        body: [
          "Account data: your email, the name you type, and an authentication record held by Supabase, our database and auth provider.",
          "Invoice data: the client name, description, amount, currency, and due date you enter, plus the public link generated for each invoice.",
          "Usage data: how many times an invoice link was opened, whether the referral invitation on it was clicked, and the credit movements in your ledger.",
          "A language cookie (involoop_lang) and, if you arrived through someone's invoice, a referral cookie (ref_invoice) that expires after 7 days.",
        ],
      },
      {
        heading: "What we never store",
        body: [
          "Card numbers, CVCs, and bank credentials. Payment details are entered on Stripe's own checkout page and never reach our servers.",
        ],
      },
      {
        heading: "Who else processes your data",
        body: [
          "Supabase (database, authentication), Stripe (payments), Vercel (hosting and request logs), and an AI provider that receives only the billing sentence you type when you ask it to compose an invoice.",
          "The sentence you send to the AI step is used to produce that invoice and is not used to train models by us.",
        ],
      },
      {
        heading: "Invoices are public by design",
        body: [
          "Anyone holding an invoice link can see its contents without logging in. That is what makes the link shareable, so treat the link like the invoice itself and only send it to the client it belongs to.",
        ],
      },
      {
        heading: "Deletion and questions",
        body: [
          "Email hello@involoop.vercel.app to request a copy of your data or the deletion of your account and invoices. We aim to respond within 30 days.",
        ],
      },
    ],
  },
  id: {
    title: "Kebijakan Privasi",
    intro:
      "Kebijakan ini menjelaskan data apa yang Involoop simpan, untuk apa, dan apa yang bisa kamu minta hapus. Isinya menggambarkan produk sebagaimana berjalan saat ini.",
    sections: [
      {
        heading: "Data yang kami simpan",
        body: [
          "Data akun: email, nama yang kamu isi, dan catatan autentikasi yang disimpan Supabase sebagai penyedia database dan autentikasi kami.",
          "Data invoice: nama klien, deskripsi, nominal, mata uang, dan jatuh tempo yang kamu isi, beserta link publik yang dibuat untuk tiap invoice.",
          "Data penggunaan: berapa kali link invoice dibuka, apakah ajakan referral di dalamnya diklik, dan pergerakan kredit di ledger-mu.",
          "Cookie bahasa (involoop_lang) dan, jika kamu datang lewat invoice orang lain, cookie referral (ref_invoice) yang kedaluwarsa dalam 7 hari.",
        ],
      },
      {
        heading: "Yang tidak pernah kami simpan",
        body: [
          "Nomor kartu, CVC, dan kredensial bank. Detail pembayaran diisi di halaman checkout milik Stripe dan tidak pernah sampai ke server kami.",
        ],
      },
      {
        heading: "Pihak lain yang memproses data",
        body: [
          "Supabase (database, autentikasi), Stripe (pembayaran), Vercel (hosting dan log permintaan), serta penyedia AI yang hanya menerima kalimat tagihan yang kamu ketik ketika meminta invoice disusun.",
          "Kalimat yang dikirim ke tahap AI dipakai untuk menyusun invoice tersebut dan tidak kami gunakan untuk melatih model.",
        ],
      },
      {
        heading: "Invoice memang bersifat publik",
        body: [
          "Siapa pun yang memegang link invoice bisa melihat isinya tanpa login. Justru itu yang membuat link-nya bisa dibagikan, jadi perlakukan link seperti invoice itu sendiri dan kirim hanya ke klien yang bersangkutan.",
        ],
      },
      {
        heading: "Penghapusan dan pertanyaan",
        body: [
          "Kirim email ke hello@involoop.vercel.app untuk meminta salinan datamu atau penghapusan akun dan invoice. Kami berusaha menjawab dalam 30 hari.",
        ],
      },
    ],
  },
};

const terms: Record<Lang, Doc> = {
  en: {
    title: "Terms of Service",
    intro:
      "Short version: Involoop helps you write and share invoices. The agreement about the work and the money stays between you and your client.",
    sections: [
      {
        heading: "Payments run in test mode",
        body: [
          "Involoop currently processes payments through Stripe in test mode. No real money moves, and every payment screen says so. Do not treat a test-mode payment as settlement of a real debt.",
        ],
      },
      {
        heading: "Credits",
        body: [
          "One credit publishes one invoice. New accounts receive 3 credits. When a client signs up through your invoice, you receive 3 credits and they receive 2 on top of their own 3.",
          "Credits are a usage allowance inside the product. They are not money, cannot be exchanged for cash, and have no value outside Involoop.",
          "Paid plans add credits to your account. Because a published invoice is delivered immediately, paid credits are non-refundable once spent.",
        ],
      },
      {
        heading: "What you are responsible for",
        body: [
          "The accuracy of every invoice you publish, including amounts, taxes, and the agreement behind it. Involoop is a tool for creating and sharing invoices, not a party to your contract and not your accountant.",
          "Only invoicing people and businesses you actually did work for. Using the product to send unsolicited invoices, to mislead, or to break the law ends the account.",
        ],
      },
      {
        heading: "The AI step",
        body: [
          "The AI turns your sentence into draft fields. It can misread an amount, a name, or a date, which is why every invoice is shown to you for review before it is published. You publish it, so you own what it says.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "The service is provided as is, without warranty, and may change or be interrupted. Keep your own records of anything you need to keep.",
        ],
      },
      {
        heading: "Contact",
        body: ["Questions about these terms: hello@involoop.vercel.app."],
      },
    ],
  },
  id: {
    title: "Ketentuan Layanan",
    intro:
      "Versi singkat: Involoop membantumu menulis dan membagikan invoice. Kesepakatan soal pekerjaan dan uangnya tetap antara kamu dan klienmu.",
    sections: [
      {
        heading: "Pembayaran berjalan di test mode",
        body: [
          "Saat ini Involoop memproses pembayaran lewat Stripe dalam mode test. Tidak ada uang asli yang berpindah, dan setiap halaman pembayaran menyatakannya. Jangan anggap pembayaran test-mode sebagai pelunasan tagihan sungguhan.",
        ],
      },
      {
        heading: "Kredit",
        body: [
          "Satu kredit untuk menerbitkan satu invoice. Akun baru mendapat 3 kredit. Saat klien mendaftar lewat invoicemu, kamu mendapat 3 kredit dan dia mendapat 2 di atas 3 kredit miliknya.",
          "Kredit adalah jatah pemakaian di dalam produk. Kredit bukan uang, tidak bisa ditukar dengan uang tunai, dan tidak punya nilai di luar Involoop.",
          "Paket berbayar menambah kredit ke akunmu. Karena invoice yang diterbitkan langsung tersampaikan, kredit berbayar yang sudah terpakai tidak dapat dikembalikan.",
        ],
      },
      {
        heading: "Tanggung jawabmu",
        body: [
          "Kebenaran setiap invoice yang kamu terbitkan, termasuk nominal, pajak, dan kesepakatan di baliknya. Involoop adalah alat untuk membuat dan membagikan invoice, bukan pihak dalam kontrakmu dan bukan akuntanmu.",
          "Hanya menagih orang atau bisnis yang memang kamu kerjakan pekerjaannya. Memakai produk ini untuk mengirim tagihan tanpa dasar, menyesatkan, atau melanggar hukum akan menghentikan akun.",
        ],
      },
      {
        heading: "Bagian AI",
        body: [
          "AI mengubah kalimatmu menjadi draf isian. AI bisa salah membaca nominal, nama, atau tanggal, karena itu setiap invoice ditampilkan dulu untuk kamu periksa sebelum diterbitkan. Kamu yang menerbitkan, jadi isinya menjadi tanggung jawabmu.",
        ],
      },
      {
        heading: "Ketersediaan",
        body: [
          "Layanan diberikan apa adanya, tanpa jaminan, dan bisa berubah atau terhenti. Simpan sendiri catatan apa pun yang kamu perlukan.",
        ],
      },
      {
        heading: "Kontak",
        body: ["Pertanyaan soal ketentuan ini: hello@involoop.vercel.app."],
      },
    ],
  },
};

export const legalDocs = { privacy, terms };

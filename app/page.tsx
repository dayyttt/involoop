import Link from "next/link";
import NeonLandscape from "@/components/NeonLandscape";

const features = [
  ["01", "Invoice dari satu kalimat", "AI memecah kalimat tagihan jadi nama klien, nominal, deskripsi, tenggat, dan CTA referral."],
  ["02", "Link publik siap kirim", "Bagikan invoice lewat WhatsApp, email, atau channel yang sudah kamu pakai tanpa setup pengiriman baru."],
  ["03", "Konfirmasi pembayaran", "Klien melihat instruksi pembayaran dan mengonfirmasi transfer langsung dari halaman invoice."],
  ["04", "CTA yang relevan", "AI menulis ajakan sesuai jasa yang ditagih, bukan iklan generik yang terasa dipaksakan."],
  ["05", "Reward dua arah", "Freelancer mendapat 3 kredit, sementara klien yang mendaftar mendapat bonus 2 kredit."],
  ["06", "Loop terlihat jelas", "Referral, kredit, dan invoice langsung muncul di dashboard agar pertumbuhan bisa didemokan end-to-end."],
];

const process = [
  ["01", "Tulis", "Tulis tagihan natural seperti berbicara ke asisten."],
  ["02", "Susun", "AI mengubahnya menjadi invoice terstruktur dan CTA kontekstual."],
  ["03", "Kirim", "Bagikan link publik lewat channel pilihanmu."],
  ["04", "Bayar", "Klien menyelesaikan tagihan dari halaman yang bersih."],
  ["05", "Tumbuh", "Klien mendaftar, kedua pihak mendapat kredit, loop dimulai lagi."],
];

const personas = [
  "DESAINER",
  "DEVELOPER",
  "KONSULTAN",
  "VIDEO EDITOR",
  "FREELANCER SOLO",
  "CREATOR B2B",
];

export default function Home() {
  return (
    <main className="landing">
      <header className="site-header">
        <div className="site-shell header-inner">
          <Link href="#home" className="brand">
            Invo<span className="brand-accent">loop</span>
          </Link>
          <nav className="site-nav" aria-label="Navigasi utama">
            <a href="#why">Kenapa</a>
            <a href="#features">Fitur</a>
            <a href="#process">Cara kerja</a>
            <a href="#reward">Reward</a>
            <a href="#pricing">Harga</a>
          </nav>
          <Link href="/signup" className="btn btn-primary">
            Mulai gratis
          </Link>
        </div>
      </header>

      <section id="home" className="agency-hero">
        <NeonLandscape />
        <div className="hero-shade" />
        <div className="site-shell agency-hero-inner">
          <div className="agency-hero-copy">
            <span className="section-eyebrow">Distribution-first invoicing</span>
            <h1>
              Buat invoice dalam hitungan detik.
              <br />
              Dapatkan invoice berikutnya secara <span className="gradient-text">gratis</span>.
            </h1>
            <p>
              Tulis tagihan dalam satu kalimat, kirim lewat link, dan dapatkan
              kredit saat klien bisnismu ikut menggunakan Involoop. Invoice
              yang ikut mencari pengguna baru.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Buat invoice pertama →
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg">
                Masuk dashboard
              </Link>
            </div>
            <div className="hero-points">
              <span>
                <b>1 kredit</b> = 1 invoice publik
              </span>
              <span>
                <b>+3</b> reward per referral
              </span>
              <span>
                <b>+2</b> bonus untuk klien
              </span>
            </div>
          </div>
        </div>
        <div className="trust-strip">
          <div className="marquee">
            <div className="marquee-track">
              {[...personas, ...personas].map((item, i) => (
                <span key={i}>{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="why" className="site-shell section-space split-section">
        <img src="/involoop-about.jpg" alt="Freelancer mengelola pekerjaan" className="section-image" />
        <div>
          <p className="section-eyebrow">KENAPA INVOLOOP</p>
          <h2>Tagihanmu sudah punya distribusi. Kami membuatnya bekerja.</h2>
          <div className="value-list">
            <span>◆ Tanpa promosi tambahan</span>
            <span>◆ Tanpa form panjang</span>
            <span>◆ Reward dua arah</span>
          </div>
          <p className="body-copy">
            Involoop dibuat untuk freelancer, micro-agency, dan profesional jasa
            B2B yang saling membeli dan menjual jasa — bukan invoice untuk
            konsumen umum.
          </p>
          <p className="body-copy">
            Freelancer sudah rutin mengirim invoice ke pemilik bisnis dan profesional lain.
            Itu audiens yang relevan, hadir di momen bernilai tinggi, dan selama ini belum
            dipakai sebagai jalur pertumbuhan.
          </p>
          <p className="body-copy">
            Involoop menaruh CTA referral tepat setelah detail pembayaran. Bukan pop-up,
            bukan kampanye marketing terpisah — hanya langkah berikutnya yang masuk akal.
          </p>
          <div className="metric-row">
            <div><strong>3</strong><span>Kredit awal</span></div>
            <div><strong>+3</strong><span>Untuk referrer</span></div>
            <div><strong>+2</strong><span>Untuk klien</span></div>
          </div>
          <Link href="/signup" className="btn btn-primary">Coba sekarang →</Link>
        </div>
      </section>

      <section id="features" className="section-space muted-band">
        <div className="site-shell">
          <div className="section-top">
            <div>
              <p className="section-eyebrow">FITUR INTI</p>
              <h2>Satu alur untuk menagih dan tumbuh.</h2>
            </div>
            <Link href="/signup" className="btn btn-ghost">Mulai gratis</Link>
          </div>
          <div className="feature-grid">
            {features.map(([number, title, text], index) => (
              <article className={`feature-card${index === 1 ? " feature-card-active" : ""}`} key={number}>
                <span className="feature-icon">{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link href="/signup">Coba fitur →</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="site-shell section-space">
        <div className="process-head">
          <p className="section-eyebrow">ALUR PRODUK</p>
          <h2>Lima langkah. Satu loop lengkap.</h2>
          <p className="body-copy">
            Dari satu kalimat tagihan sampai referral yang kembali ke dashboard-mu —
            semuanya mengalir dalam satu alur.
          </p>
        </div>
        <div className="process-grid">
          {process.map(([number, title, text]) => (
            <article className="p-step" key={number}>
              <span className="p-node">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="reward" className="reward-band section-space">
        <div className="site-shell reward-inner">
          <p className="section-eyebrow">REWARD DUA ARAH</p>
          <h2>Kedua pihak menang. Loop lanjut sendiri.</h2>
          <p className="reward-lead">
            Freelancer tidak perlu mengubah cara kerja. Klien tidak dipaksa ikut.
            Reward muncul hanya ketika referral benar-benar selesai mendaftar.
          </p>
          <div className="reward-grid">
            <article><span>A</span><h3>Freelancer</h3><strong>+3 kredit</strong><p>Setiap referral berhasil dari invoice.</p></article>
            <div className="reward-arrow">→</div>
            <article><span>B</span><h3>Klien</h3><strong>+2 kredit</strong><p>Bonus di atas 3 kredit signup biasa.</p></article>
          </div>
          <Link href="/signup" className="btn btn-primary btn-lg">Mulai loop pertamamu</Link>
        </div>
      </section>

      <section id="pricing" className="site-shell section-space">
        <div className="process-head">
          <p className="section-eyebrow">HARGA</p>
          <h2>Satu kredit, satu invoice publik.</h2>
          <p className="body-copy">
            1 kredit = 1 invoice yang kamu publikasikan. Kredit didapat dari
            referral, sehingga biaya menagih bisa kembali terbayar dari
            distribusi.
          </p>
        </div>
        <div className="pricing-grid">
          <div className="plan">
            <h3 className="plan-name">Gratis</h3>
            <div className="plan-price">Rp 0</div>
            <p className="plan-desc">Mulai menagih tanpa biaya.</p>
            <ul className="plan-features">
              <li>3 invoice publik</li>
              <li>+3 kredit per referral</li>
              <li>Link publik + CTA referral</li>
            </ul>
            <Link href="/signup" className="btn btn-ghost" style={{ width: "100%" }}>
              Daftar gratis
            </Link>
          </div>
          <div className="plan plan-featured">
            <h3 className="plan-name">Starter</h3>
            <div className="plan-price">Rp 29.000</div>
            <p className="plan-desc">Untuk freelancer aktif menagih tiap minggu.</p>
            <ul className="plan-features">
              <li>10 invoice publik</li>
              <li>Semua fitur gratis</li>
              <li>Riwayat kredit lengkap</li>
            </ul>
            <Link href="/signup" className="btn btn-primary" style={{ width: "100%" }}>
              Mulai
            </Link>
          </div>
          <div className="plan">
            <h3 className="plan-name">Pro</h3>
            <div className="plan-price">Rp 79.000<span>/bulan</span></div>
            <p className="plan-desc">Untuk micro-agency dan volume tinggi.</p>
            <ul className="plan-features">
              <li>50 invoice publik</li>
              <li>Prioritas tanpa batas</li>
              <li>Loop distribusi maksimal</li>
            </ul>
            <Link href="/signup" className="btn btn-ghost" style={{ width: "100%" }}>
              Hubungi kami
            </Link>
          </div>
        </div>
        <p className="hint" style={{ textAlign: "center", marginTop: 28 }}>
          Langganan berbayar belum diaktifkan di hackathon — paket ini menjelaskan
          bagaimana Involoop menghasilkan uang.
        </p>
      </section>

      <section className="site-shell section-space final-cta">
        <div>
          <p className="section-eyebrow">SIAP MENAGIH?</p>
          <h2>Buat satu invoice. Biarkan produkmu ikut menyebar.</h2>
          <p>Gratis 3 kredit. Tanpa kartu kredit. Link publik siap dikirim.</p>
        </div>
        <Link href="/signup" className="btn btn-primary btn-lg">Daftar gratis →</Link>
      </section>

      <footer className="site-footer">
        <div className="site-shell footer-inner">
          <Link href="#home" className="brand">Invo<span className="brand-accent">loop</span></Link>
          <nav><a href="#why">Kenapa</a><span>◆</span><a href="#features">Fitur</a><span>◆</span><a href="#process">Cara kerja</a><span>◆</span><Link href="/login">Masuk</Link></nav>
          <div className="footer-bottom"><span>Copyright © 2026 Involoop.</span><span>Invoice yang menyebar sendiri.</span></div>
        </div>
      </footer>
    </main>
  );
}

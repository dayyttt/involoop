import Link from "next/link";
import NeonLandscape from "@/components/NeonLandscape";

const features = [
  ["01", "Invoice dari satu kalimat", "AI memecah kalimat tagihan jadi nama klien, nominal, deskripsi, tenggat, dan CTA referral."],
  ["02", "Link publik siap kirim", "Bagikan invoice lewat WhatsApp, email, atau channel yang sudah kamu pakai tanpa setup pengiriman baru."],
  ["03", "Pembayaran tanpa friksi", "Klien membuka halaman yang fokus, membaca detail, lalu menyelesaikan pembayaran dari satu layar."],
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
              Invoice yang ikut <span className="gradient-text">mencari pengguna</span> baru.
            </h1>
            <p>
              Buat invoice dari satu kalimat. Kirim seperti biasa. Saat klien membayar,
              Involoop membuka jalur referral yang memberi reward ke kedua pihak.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary btn-lg">
                Buat invoice pertama →
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg">
                Masuk dashboard
              </Link>
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
        <p className="section-eyebrow">ALUR PRODUK</p>
        <h2>Lima langkah. Satu loop lengkap.</h2>
        <img src="/involoop-process.jpg" alt="Proses kerja freelancer" className="process-image" />
        <div className="process-stack">
          {process.map(([number, title, text]) => (
            <article className="process-row" key={number}>
              <div><strong>{number}</strong><h3>{title}</h3></div>
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

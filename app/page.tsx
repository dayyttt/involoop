import Link from "next/link";
import LoopScene from "@/components/LoopScene";

export default function Home() {
  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
        <Link href="/login" className="btn btn-ghost">
          Masuk
        </Link>
      </nav>

      <main className="wrap">
        <section className="hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <span className="pill">Distribution-first</span>
              <h1>
                Setiap tagihan yang kamu kirim jadi{" "}
                <span className="gradient-text">distributor</span>-mu.
              </h1>
              <p className="sub">
                Involoop mengubah invoice biasa jadi jalur referral yang hidup.
                Klien yang membuka tagihanmu diajak menagih lewat Involoop —
                kamu dapat kredit, mereka dapat bonus.
              </p>
              <div className="ctas">
                <Link href="/signup" className="btn btn-primary btn-lg">
                  Daftar gratis
                </Link>
                <Link href="/login" className="btn btn-ghost btn-lg">
                  Masuk
                </Link>
              </div>
              <div className="hero-points">
                <span>
                  <b>3</b> kredit gratis
                </span>
                <span>
                  <b>+3</b> kredit per referral
                </span>
                <span>
                  <b>+2</b> bonus untuk klien
                </span>
              </div>
            </div>

            <div className="hero-visual">
              <LoopScene />
            </div>
          </div>
        </section>

        <section className="how">
          <div className="section-head">
            <span className="eyebrow">Cara kerjanya</span>
            <h2>Invoice biasa, loop yang jalan sendiri.</h2>
          </div>

          <div className="steps">
            <div className="step">
              <div className="num">01</div>
              <h3>Tagih pakai satu kalimat</h3>
              <p>
                Ketik &ldquo;tagih Rina 2 juta buat desain logo&rdquo; — AI
                menyusun invoice sekaligus menulis baris ajakan yang kontekstual.
              </p>
            </div>
            <div className="step">
              <div className="num">02</div>
              <h3>Klien bayar di halaman invoice</h3>
              <p>
                Kirim link lewat channel apa pun. Di bawah tombol bayar ada CTA
                singkat yang relevan dengan jenis jasamu.
              </p>
            </div>
            <div className="step">
              <div className="num">03</div>
              <h3>Loop menutup sendiri</h3>
              <p>
                Klien yang daftar lewat invoicemu memberi kredit tambahan ke kamu
                dan bonus untuk mereka. Nggak perlu promosi terpisah.
              </p>
            </div>
          </div>

          <div className="loop-band">
            <div className="loop-col">
              <span className="loop-num">A</span>
              <h3>Freelancer</h3>
              <p>
                +3 kredit invoice setiap klien yang daftar lewat invoicemu.
              </p>
            </div>
            <div className="loop-arrow">→</div>
            <div className="loop-col">
              <span className="loop-num">B</span>
              <h3>Klien</h3>
              <p>
                Bonus 2 kredit begitu daftar dari CTA di bawah tombol bayar.
              </p>
            </div>
          </div>

          <div className="cta-row">
            <Link href="/signup" className="btn btn-primary btn-lg">
              Buat invoice pertama gratis
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

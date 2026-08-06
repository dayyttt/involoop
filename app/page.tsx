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
          <LoopScene />
          <span className="pill">Distribution-first</span>
          <h1>
            Setiap tagihan yang kamu kirim
            <br />
            jadi <span className="gradient-text">distributor</span>-mu.
          </h1>
          <p className="sub">
            Involoop mengubah invoice biasa jadi jalur referral yang hidup.
            Klien yang membuka tagihanmu diajak menagih lewat Involoop — kamu
            dapat kredit, mereka dapat bonus.
          </p>
          <div className="ctas">
            <Link href="/signup" className="btn btn-primary btn-lg">
              Daftar gratis
            </Link>
            <Link href="/dashboard" className="btn btn-ghost btn-lg">
              Masuk dashboard
            </Link>
          </div>
        </section>

        <section className="steps">
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
        </section>
      </main>
    </>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

export default function NotFound() {
  const lang: Lang = cookies().get(LANG_COOKIE)?.value === "id" ? "id" : "en";

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
      </nav>
      <main className="centered">
        <h1 className="page-title">
          {lang === "id" ? "Halaman tidak ditemukan" : "Page not found"}
        </h1>
        <p className="hint" style={{ maxWidth: 420, margin: "0 auto 20px" }}>
          {lang === "id"
            ? "Link ini mungkin salah ketik, atau invoicenya sudah dihapus oleh pengirim."
            : "This link may be mistyped, or the invoice was removed by its sender."}
        </p>
        <Link href="/" className="btn btn-primary">
          {lang === "id" ? "Kembali ke beranda" : "Back to home"}
        </Link>
      </main>
    </>
  );
}

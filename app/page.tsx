import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: "0 20px", textAlign: "center" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Involoop</h1>
      <p style={{ color: "#555", fontSize: 16, marginBottom: 32 }}>
        Kirim tagihan seperti biasa. Setiap tagihan yang klienmu buka membawa
        kesempatan buat orang lain jadi penggunamu berikutnya.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <Link href="/signup" style={{ padding: "10px 20px", background: "#111", color: "#fff", borderRadius: 8, textDecoration: "none" }}>
          Daftar gratis
        </Link>
        <Link href="/login" style={{ padding: "10px 20px", border: "1px solid #ddd", borderRadius: 8, textDecoration: "none", color: "#111" }}>
          Masuk
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function NewInvoice() {
  const supabase = createClient();
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ share_url: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Kamu belum login.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/invoices/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal membuat invoice");
      return;
    }

    setResult({ share_url: data.share_url });
  }

  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Buat invoice</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Tulis dalam satu kalimat, biar AI yang susun invoicenya.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="contoh: tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu"
          rows={3}
          style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" }}
        />
        <button
          type="submit"
          disabled={loading || !rawText}
          style={{ marginTop: 12, padding: "10px 20px", background: "#111", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer" }}
        >
          {loading ? "Menyusun invoice..." : "Buat invoice dengan AI"}
        </button>
      </form>

      {error && <p style={{ color: "#c0362c", marginTop: 16 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 24, padding: 16, border: "1px solid #d7f0da", background: "#f2fbf3", borderRadius: 10 }}>
          <p style={{ marginBottom: 8 }}>Invoice siap. Kirim link ini ke klienmu:</p>
          <code style={{ display: "block", padding: 8, background: "#fff", borderRadius: 6, wordBreak: "break-all" }}>
            {result.share_url}
          </code>
          <a
            href={`https://wa.me/?text=${encodeURIComponent("Halo, ini tagihan untuk kamu: " + result.share_url)}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-block", marginTop: 12, color: "#1a7f37" }}
          >
            Kirim via WhatsApp →
          </a>
        </div>
      )}
    </main>
  );
}

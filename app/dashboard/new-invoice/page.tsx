"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
        <Link href="/dashboard" className="btn btn-ghost">
          ← Dashboard
        </Link>
      </nav>

      <main className="page-shell" style={{ maxWidth: 560 }}>
        <h1 className="page-title">Buat invoice</h1>
        <p className="muted" style={{ marginTop: -8, marginBottom: 20 }}>
          Tulis dalam satu kalimat, biar AI yang menyusun invoicenya.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
          <textarea
            className="input"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="contoh: tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu"
            rows={3}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !rawText}
            style={{ marginTop: 12, alignSelf: "flex-start" }}
          >
            {loading ? "Menyusun invoice..." : "Buat invoice dengan AI"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {result && (
          <div className="success-panel">
            <p>Invoice siap. Kirim link ini ke klienmu:</p>
            <code className="code">{result.share_url}</code>
            <a
              href={`https://wa.me/?text=${encodeURIComponent("Halo, ini tagihan untuk kamu: " + result.share_url)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-success"
              style={{ marginTop: 12 }}
            >
              Kirim via WhatsApp →
            </a>
          </div>
        )}
      </main>
    </>
  );
}

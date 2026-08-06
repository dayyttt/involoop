"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

const SAMPLE = "Tagih PT Kreatif Digital Rp2.500.000 untuk pengembangan landing page, jatuh tempo 12 Agustus 2026.";

export default function NewInvoice() {
  const supabase = createClient();
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ share_url: string } | null>(null);
  const [showManual, setShowManual] = useState(false);

  const [manual, setManual] = useState({
    client_name: "",
    description: "",
    amount: "",
    currency: "USD",
    due_date: "",
  });

  async function handleAI(e: React.FormEvent) {
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
      if (res.status === 502) setShowManual(true);
      return;
    }

    setResult({ share_url: data.share_url });
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amount = Number(manual.amount.replace(/[^0-9.]/g, ""));
    const res = await fetch("/api/invoices/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manual: true,
        client_name: manual.client_name,
        description: manual.description,
        amount,
        currency: manual.currency,
        due_date: manual.due_date || null,
      }),
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

        <form onSubmit={handleAI} style={{ display: "flex", flexDirection: "column" }}>
          <textarea
            className="input"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="contoh: tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu"
            rows={3}
          />
          <button
            type="button"
            onClick={() => setRawText(SAMPLE)}
            className="btn btn-ghost"
            style={{ marginTop: 8, alignSelf: "flex-start", minHeight: 30, padding: "5px 12px", fontSize: 12 }}
          >
            Pakai contoh →
          </button>
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

        {!showManual && (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="btn btn-ghost"
            style={{ marginTop: 16, fontSize: 13 }}
          >
            Isi manual saja
          </button>
        )}

        {showManual && (
          <form
            onSubmit={handleManual}
            style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <p className="section-eyebrow">FORM MANUAL</p>
            <div className="field">
              <label>Nama klien</label>
              <input
                className="input"
                value={manual.client_name}
                onChange={(e) => setManual({ ...manual, client_name: e.target.value })}
                placeholder="Mis. Rina"
                required
              />
            </div>
            <div className="field">
              <label>Deskripsi jasa</label>
              <input
                className="input"
                value={manual.description}
                onChange={(e) => setManual({ ...manual, description: e.target.value })}
                placeholder="Mis. Desain logo"
                required
              />
            </div>
            <div className="field">
              <label>Nominal</label>
              <input
                className="input"
                value={manual.amount}
                onChange={(e) => setManual({ ...manual, amount: e.target.value })}
                placeholder="50"
                required
              />
            </div>
            <div className="field">
              <label>Currency</label>
              <select
                className="input"
                value={manual.currency}
                onChange={(e) => setManual({ ...manual, currency: e.target.value })}
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="SGD">SGD — Singapore Dollar</option>
                <option value="IDR">IDR — Indonesian Rupiah</option>
              </select>
            </div>
            <div className="field">
              <label>Jatuh tempo</label>
              <input
                className="input"
                type="date"
                value={manual.due_date}
                onChange={(e) => setManual({ ...manual, due_date: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !manual.client_name || !manual.description || !manual.amount}
            >
              {loading ? "Menerbitkan..." : "Terbitkan invoice"}
            </button>
          </form>
        )}

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

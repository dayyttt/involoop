"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { formatMoney } from "@/lib/money";

const SAMPLE = "Tagih PT Kreatif Digital Rp2.500.000 untuk pengembangan landing page, jatuh tempo 12 Agustus 2026.";

const SAMPLES = [
  SAMPLE,
  "Kirim tagihan ke Rina sebesar 2 juta buat desain logo.",
  "Invoice desain kaos ke Toko Santai 3.750.000 IDR, jatuh tempo seminggu.",
];

interface FormState {
  client_name: string;
  description: string;
  amount: string;
  currency: string;
  due_date: string;
  cta_message: string;
}

const EMPTY_FORM: FormState = {
  client_name: "",
  description: "",
  amount: "",
  currency: "IDR",
  due_date: "",
  cta_message: "",
};

export default function NewInvoice() {
  const supabase = createClient();
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ share_url: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [source, setSource] = useState<"ai" | "manual" | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startManual() {
    setForm(EMPTY_FORM);
    setSource("manual");
    setShowForm(true);
    setError(null);
  }

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

    const res = await fetch("/api/invoices/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyusun invoice");
      return;
    }

    const p = data.parsed;
    setForm({
      client_name: p.client_name ?? "",
      description: p.description ?? "",
      amount: typeof p.amount === "number" ? String(p.amount) : "",
      currency: p.currency ?? "IDR",
      due_date: p.due_date ?? "",
      cta_message: p.cta_message ?? "",
    });
    setSource("ai");
    setShowForm(true);
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCopied(false);

    const amount = Number(form.amount.replace(/[^0-9.]/g, ""));
    if (!(amount > 0)) {
      setError("Nominal tidak valid.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/invoices/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manual: true,
        client_name: form.client_name,
        description: form.description,
        amount,
        currency: form.currency,
        due_date: form.due_date || null,
        cta_message: form.cta_message || null,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menerbitkan invoice");
      return;
    }

    setResult({ share_url: data.share_url });
    setShowForm(false);
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Gagal menyalin. Salin manual dari link di bawah.");
    }
  }

  const amountNum = Number(form.amount.replace(/[^0-9.]/g, ""));
  const previewReady = form.client_name && form.description && amountNum > 0;
  const step = result ? 3 : showForm ? 2 : 1;

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

      <main className="page-shell" style={{ maxWidth: 780 }}>
        {result ? (
          <div className="success-panel" style={{ marginTop: 40, padding: "32px 20px", textAlign: "center" }}>
            <div className="success-hero">✓</div>
            <p className="section-eyebrow" style={{ textAlign: "center" }}>INVOICE DITERBITKAN</p>
            <h2 className="page-title" style={{ textAlign: "center", margin: "10px 0 18px", fontSize: 22 }}>
              Invoice siap. Kirim link ini ke klienmu:
            </h2>
            <div className="link-copy-row" style={{ maxWidth: 520, marginInline: "auto" }}>
              <code className="code">{result.share_url}</code>
              <button onClick={copyLink} className="btn btn-ghost">
                {copied ? "✓ Tersalin" : "Salin"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent("Halo, ini tagihan untuk kamu: " + result.share_url)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success btn-mobile-full"
              >
                Kirim via WhatsApp →
              </a>
              <Link href="/dashboard" className="btn btn-primary btn-mobile-full">
                Lihat dashboard
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Buat invoice</h1>
            <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>
              Tulis dalam satu kalimat, biar AI yang menyusun invoicenya.
            </p>

            <Steps current={step as 1 | 2 | 3} />

            {!showForm && (
              <div className="card-panel">
                <form onSubmit={handleAI} style={{ display: "flex", flexDirection: "column" }}>
                  <div className="field">
                    <label>Kalimat tagihanmu</label>
                    <textarea
                      className="input"
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="contoh: tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu"
                      rows={3}
                    />
                  </div>
                  <div className="chip-row">
                    {SAMPLES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRawText(s)}
                        className="chip"
                      >
                        Pakai contoh →
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-mobile-full"
                    disabled={loading || !rawText.trim()}
                    style={{ marginTop: 16 }}
                  >
                    {loading ? (
                      <>
                        <Spinner /> Menyusun invoice…
                      </>
                    ) : (
                      "Buat invoice dengan AI"
                    )}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={startManual}
                  className="btn btn-ghost btn-mobile-full"
                  style={{ marginTop: 14 }}
                >
                  Isi manual saja
                </button>
              </div>
            )}

            {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}

            {showForm && (
              <div className="app-grid">
                <div className="card-panel">
                  {source === "ai" ? (
                    <p className="hint" style={{ marginBottom: 14 }}>
                      ✨ Hasil AI — periksa dan edit dulu sebelum diterbitkan.
                    </p>
                  ) : (
                    <p className="hint" style={{ marginBottom: 14 }}>
                      Isi detail invoice, lalu terbitkan.
                    </p>
                  )}
                  <form onSubmit={handlePublish} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="field">
                      <label>Nama klien</label>
                      <input
                        className="input"
                        value={form.client_name}
                        onChange={(e) => setField("client_name", e.target.value)}
                        placeholder="Mis. Rina"
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Deskripsi jasa</label>
                      <input
                        className="input"
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                        placeholder="Mis. Desain logo"
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label>Nominal</label>
                        <input
                          className="input"
                          value={form.amount}
                          onChange={(e) => setField("amount", e.target.value)}
                          placeholder="50"
                          required
                        />
                      </div>
                      <div className="field">
                        <label>Currency</label>
                        <select
                          className="input"
                          value={form.currency}
                          onChange={(e) => setField("currency", e.target.value)}
                        >
                          <option value="IDR">IDR — Rupiah</option>
                          <option value="USD">USD — US Dollar</option>
                          <option value="EUR">EUR — Euro</option>
                          <option value="GBP">GBP — British Pound</option>
                          <option value="SGD">SGD — Singapore Dollar</option>
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>Jatuh tempo</label>
                      <input
                        className="input"
                        type="date"
                        value={form.due_date}
                        onChange={(e) => setField("due_date", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Pesan ajakan (opsional)</label>
                      <input
                        className="input"
                        value={form.cta_message}
                        onChange={(e) => setField("cta_message", e.target.value)}
                        placeholder="Muncul di halaman invoice klien"
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-mobile-full"
                      disabled={loading || !form.client_name || !form.description || !form.amount}
                    >
                      {loading ? "Menerbitkan…" : "Terbitkan invoice"}
                    </button>
                  </form>
                </div>

                <div className="sticky-col">
                  {previewReady ? (
                    <div className="card" style={{ padding: 26, opacity: 1 }}>
                      <p className="section-eyebrow">PRATINJAU</p>
                      <div className="invoice-head" style={{ marginTop: 14 }}>
                        <div>
                          <p className="invoice-label">TO</p>
                          <h2 className="invoice-client" style={{ marginBottom: 0 }}>{form.client_name}</h2>
                        </div>
                        <div className="invoice-meta">
                          <span className="badge badge-warn">DRAFT</span>
                        </div>
                      </div>
                      <p className="invoice-desc" style={{ margin: "14px 0 18px" }}>{form.description}</p>
                      <div className="invoice-amount">{formatMoney(amountNum, form.currency)}</div>
                      {form.due_date && (
                        <p className="hint" style={{ margin: "6px 0 0" }}>
                          Jatuh tempo {new Date(form.due_date).toLocaleDateString("id-ID")}
                        </p>
                      )}
                      {form.cta_message && (
                        <div className="referral-box" style={{ textAlign: "left" }}>
                          <p className="hint" style={{ margin: 0 }}>{form.cta_message}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="card" style={{ padding: 26, opacity: 0.9 }}>
                      <p className="section-eyebrow">PRATINJAU</p>
                      <p className="empty" style={{ marginTop: 14 }}>
                        Preview invoice muncul di sini setelah kamu melengkapi
                        nama klien, deskripsi, dan nominal.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

function Spinner() {
  return <span className="spinner" aria-hidden />;
}

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const items = ["Tulis kalimat", "Periksa & edit", "Terbitkan & kirim"];
  return (
    <div className="steps">
      {items.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "step-done" : n === current ? "step-active" : "";
        return (
          <div key={label} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
            {i > 0 && <span className="step-arrow">→</span>}
            <span className={`step ${state}`}>
              <span className="step-dot">{n < current ? "✓" : n}</span>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

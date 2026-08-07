"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { formatMoney } from "@/lib/money";
import { appText, useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

const SAMPLE = "Tagih PT Kreatif Digital Rp2.500.000 untuk pengembangan landing page, jatuh tempo 12 Agustus 2026.";

const SAMPLES_ID = [
  SAMPLE,
  "Kirim tagihan ke Rina sebesar 2 juta buat desain logo.",
  "Invoice desain kaos ke Toko Santai 3.750.000 IDR, jatuh tempo seminggu.",
];

const SAMPLES_EN = [
  "Bill PT Kreatif Digital Rp2,500,000 for landing page development, due August 12, 2026.",
  "Send Rina a 2 million invoice for a logo design.",
  "Invoice a t-shirt design to Toko Santai, IDR 3,750,000, due in a week.",
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
  const lang = useLang();
  const t = (k: string) => appText(lang, k);
  const SAMPLES = lang === "id" ? SAMPLES_ID : SAMPLES_EN;
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
      setError(t("newInvoice.needLogin"));
      setLoading(false);
      return;
    }

    const res = await fetch("/api/invoices/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw_text: rawText, lang }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t("newInvoice.aiFailed"));
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
      setError(t("newInvoice.invalidAmount"));
      setLoading(false);
      return;
    }

    const res = await fetch("/api/invoices/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manual: true,
        lang,
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
      setError(data.error ?? t("newInvoice.publishFailed"));
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
      setError(t("newInvoice.copyFailed"));
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <LangToggle />
          <Link href="/dashboard" className="btn btn-ghost">
            {t("common.back")}
          </Link>
        </div>
      </nav>

      <main className="page-shell" style={{ maxWidth: 780 }}>
        {result ? (
          <div className="success-panel" style={{ marginTop: 40, padding: "32px 20px", textAlign: "center" }}>
            <div className="success-hero">✓</div>
            <p className="section-eyebrow" style={{ textAlign: "center" }}>{t("newInvoice.published")}</p>
            <h2 className="page-title" style={{ textAlign: "center", margin: "10px 0 18px", fontSize: 22 }}>
              {t("newInvoice.publishedTitle")}
            </h2>
            <div className="link-copy-row" style={{ maxWidth: 520, marginInline: "auto" }}>
              <code className="code">{result.share_url}</code>
              <button onClick={copyLink} className="btn btn-ghost">
                {copied ? t("common.copied") : t("common.copy")}
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(t("newInvoice.whatsappText") + result.share_url)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-success btn-mobile-full"
              >
                {t("common.sendWhatsapp")}
              </a>
              <Link href="/dashboard" className="btn btn-primary btn-mobile-full">
                {t("common.viewDashboard")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1 className="page-title" style={{ marginBottom: 4 }}>{t("newInvoice.title")}</h1>
            <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>
              {t("newInvoice.sub")}
            </p>

            <Steps current={step as 1 | 2 | 3} labels={[t("newInvoice.step1"), t("newInvoice.step2"), t("newInvoice.step3")]} />

            {!showForm && (
              <div className="card-panel">
                <form onSubmit={handleAI} style={{ display: "flex", flexDirection: "column" }}>
                  <div className="field">
                    <label>{t("newInvoice.sentenceLabel")}</label>
                    <textarea
                      className="input"
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder={t("newInvoice.sentencePlaceholder")}
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
                        {t("newInvoice.useSample")}
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
                        <Spinner /> {t("newInvoice.composing")}
                      </>
                    ) : (
                      t("newInvoice.createWithAI")
                    )}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={startManual}
                  className="btn btn-ghost btn-mobile-full"
                  style={{ marginTop: 14 }}
                >
                  {t("newInvoice.fillManual")}
                </button>
              </div>
            )}

            {error && <p className="error" style={{ marginTop: 14 }}>{error}</p>}

            {showForm && (
              <div className="app-grid">
                <div className="card-panel">
                  {source === "ai" ? (
                    <p className="hint" style={{ marginBottom: 14 }}>
                      {t("newInvoice.aiResultHint")}
                    </p>
                  ) : (
                    <p className="hint" style={{ marginBottom: 14 }}>
                      {t("newInvoice.manualHint")}
                    </p>
                  )}
                  <form onSubmit={handlePublish} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="field">
                      <label>{t("newInvoice.clientName")}</label>
                      <input
                        className="input"
                        value={form.client_name}
                        onChange={(e) => setField("client_name", e.target.value)}
                        placeholder={t("newInvoice.clientPlaceholder")}
                        required
                      />
                    </div>
                    <div className="field">
                      <label>{t("newInvoice.description")}</label>
                      <input
                        className="input"
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                        placeholder={t("newInvoice.descriptionPlaceholder")}
                        required
                      />
                    </div>
                    <div className="form-row">
                      <div className="field">
                        <label>{t("newInvoice.amount")}</label>
                        <input
                          className="input"
                          value={form.amount}
                          onChange={(e) => setField("amount", e.target.value)}
                          placeholder="50"
                          required
                        />
                      </div>
                      <div className="field">
                        <label>{t("newInvoice.currency")}</label>
                        <select
                          className="input"
                          value={form.currency}
                          onChange={(e) => setField("currency", e.target.value)}
                        >
                          <option value="IDR">IDR · Rupiah</option>
                          <option value="USD">USD · US Dollar</option>
                          <option value="EUR">EUR · Euro</option>
                          <option value="GBP">GBP · British Pound</option>
                          <option value="SGD">SGD · Singapore Dollar</option>
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>{t("newInvoice.dueDate")}</label>
                      <input
                        className="input"
                        type="date"
                        value={form.due_date}
                        onChange={(e) => setField("due_date", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>{t("newInvoice.ctaLabel")}</label>
                      <input
                        className="input"
                        value={form.cta_message}
                        onChange={(e) => setField("cta_message", e.target.value)}
                        placeholder={t("newInvoice.ctaPlaceholder")}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-mobile-full"
                      disabled={loading || !form.client_name || !form.description || !form.amount}
                    >
                      {loading ? t("newInvoice.publishing") : t("newInvoice.publish")}
                    </button>
                  </form>
                </div>

                <div className="sticky-col">
                  {previewReady ? (
                    <div className="card" style={{ padding: 26, opacity: 1 }}>
                      <p className="section-eyebrow">{t("newInvoice.preview")}</p>
                      <div className="invoice-head" style={{ marginTop: 14 }}>
                        <div>
                          <p className="invoice-label">{t("newInvoice.to")}</p>
                          <h2 className="invoice-client" style={{ marginBottom: 0 }}>{form.client_name}</h2>
                        </div>
                        <div className="invoice-meta">
                          <span className="badge badge-warn">{t("newInvoice.draft")}</span>
                        </div>
                      </div>
                      <p className="invoice-desc" style={{ margin: "14px 0 18px" }}>{form.description}</p>
                      <div className="invoice-amount">{formatMoney(amountNum, form.currency, lang === "id" ? "id-ID" : "en-US")}</div>
                      {form.due_date && (
                        <p className="hint" style={{ margin: "6px 0 0" }}>
                          {t("newInvoice.dueOn")} {new Date(form.due_date).toLocaleDateString(lang === "id" ? "id-ID" : "en-US")}
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
                      <p className="section-eyebrow">{t("newInvoice.preview")}</p>
                      <p className="empty" style={{ marginTop: 14 }}>
                        {t("newInvoice.previewEmpty")}
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

function Steps({ current, labels }: { current: 1 | 2 | 3; labels: [string, string, string] }) {
  return (
    <div className="steps">
      {labels.map((label, i) => {
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

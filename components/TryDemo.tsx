"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/money";
import { landingText } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

interface Parsed {
  client_name: string;
  description: string;
  amount: number;
  currency: string;
  due_date: string | null;
  cta_message: string;
}

const EXAMPLES: Record<"en" | "id", string[]> = {
  en: [
    "Bill Rina 2 million for a logo design, due in two weeks",
    "Invoice Meridian Studio $450 for a landing page",
    "Charge Toko Santai 3.75 million for 60 t-shirt designs",
  ],
  id: [
    "Tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu",
    "Invoice Meridian Studio 6 juta untuk pembuatan landing page",
    "Tagih Toko Santai 3,75 juta untuk 60 desain kaos",
  ],
};

// The landing page's proof-of-product: a visitor can watch one sentence turn
// into a real invoice before deciding whether to sign up.
export default function TryDemo() {
  const lang = useLang();
  const t = (k: string) => landingText(lang, k);
  const locale = lang === "id" ? "id-ID" : "en-US";

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Parsed | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: text, lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("demo.failed"));
      } else {
        setResult(data.parsed);
      }
    } catch {
      setError(t("demo.failed"));
    }
    setLoading(false);
  }

  function reset() {
    setResult(null);
    setError(null);
    setText("");
  }

  return (
    <div className="try-demo card">
      <h2 className="try-demo-title">{t("demo.title")}</h2>
      <p className="try-demo-sub">{t("demo.sub")}</p>

      {result ? (
        <div className="try-demo-result">
          <p className="invoice-label">{t("demo.resultLabel")}</p>
          <div className="try-demo-invoice">
            <div className="mock-head">
              <div>
                <span className="mock-label">{t("demo.to")}</span>
                <strong>{result.client_name}</strong>
              </div>
              <span className="mock-status">{lang === "id" ? "BELUM DIBAYAR" : "UNPAID"}</span>
            </div>
            <div className="mock-line">
              <span>{result.description}</span>
              <b className="money">{formatMoney(result.amount, result.currency, locale)}</b>
            </div>
            {result.due_date && (
              <p className="hint" style={{ margin: 0 }}>
                {t("demo.due")} {formatDate(result.due_date, locale)}
              </p>
            )}
            {result.cta_message && (
              <div className="try-demo-cta">
                <span className="mock-label">{t("demo.ctaLine")}</span>
                <p>{result.cta_message}</p>
              </div>
            )}
          </div>
          <div className="try-demo-actions">
            <Link href="/signup" className="btn btn-primary">
              {t("demo.publish")}
            </Link>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              {t("demo.again")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={run}>
          <label className="sr-only" htmlFor="demo-sentence">
            {t("demo.sub")}
          </label>
          <textarea
            id="demo-sentence"
            className="input"
            rows={2}
            maxLength={220}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("demo.placeholder")}
          />
          <div className="try-demo-examples">
            <span className="hint">{t("demo.tryThis")}</span>
            {EXAMPLES[lang].map((example) => (
              <button
                key={example}
                type="button"
                className="chip"
                onClick={() => setText(example)}
              >
                {example.length > 42 ? `${example.slice(0, 42)}…` : example}
              </button>
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-lg try-demo-run" disabled={loading || !text.trim()}>
            {loading ? (
              <>
                <span className="spinner" aria-hidden /> {t("demo.running")}
              </>
            ) : (
              t("demo.run")
            )}
          </button>
        </form>
      )}

      {error && <p className="error try-demo-error">{error}</p>}
    </div>
  );
}

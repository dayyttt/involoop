"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { formatMoney, formatDate } from "@/lib/money";
import { landingText } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import { saveDraft } from "@/lib/draft";

interface Parsed {
  client_name: string;
  description: string;
  amount: number;
  currency: string;
  due_date: string | null;
  cta_message: string;
}

// Short labels on the chips, full sentence into the box: three long chips
// stacked one per line and made the card look like a list of paragraphs.
const EXAMPLES: Record<"en" | "id", { label: string; text: string }[]> = {
  en: [
    { label: "Logo design", text: "Bill Rina 2 million for a logo design, due in two weeks" },
    { label: "Landing page", text: "Invoice Meridian Studio $450 for a landing page" },
    { label: "T-shirt batch", text: "Charge Toko Santai 3.75 million for 60 t-shirt designs" },
  ],
  id: [
    { label: "Desain logo", text: "Tagih Rina 2 juta buat desain logo, jatuh tempo 2 minggu" },
    { label: "Landing page", text: "Invoice Meridian Studio 6 juta untuk pembuatan landing page" },
    { label: "Desain kaos", text: "Tagih Toko Santai 3,75 juta untuk 60 desain kaos" },
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
  const reduced = useReducedMotion();

  // The result is the one moment worth animating properly: the invoice is
  // written line by line, in reading order, the way it was just dictated.
  // 70ms apart and 0.34s each, so the whole thing lands in about half a second.
  const line = (order: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.34, delay: 0.06 + order * 0.07, ease: [0.22, 0.61, 0.36, 1] as const },
        };

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

  // Handed to /dashboard/new-invoice after signup so the first real invoice
  // starts from the sentence the visitor already wrote here.
  function keepDraft() {
    saveDraft(text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(e as unknown as React.FormEvent);
  }

  return (
    <div className="try-demo card">
      <h2 className="try-demo-title">{t("demo.title")}</h2>
      <p className="try-demo-sub">{t("demo.sub")}</p>

      {result ? (
        <div className="try-demo-result">
          <motion.p className="invoice-label" {...line(0)}>
            {t("demo.resultLabel")}
          </motion.p>
          <div className="try-demo-invoice">
            <motion.div className="mock-head" {...line(1)}>
              <div>
                <span className="mock-label">{t("demo.to")}</span>
                <strong>{result.client_name}</strong>
              </div>
              <span className="mock-status">{lang === "id" ? "BELUM DIBAYAR" : "UNPAID"}</span>
            </motion.div>
            <motion.div className="mock-line" {...line(2)}>
              <span>{result.description}</span>
              <b className="money">{formatMoney(result.amount, result.currency, locale)}</b>
            </motion.div>
            {result.due_date && (
              <motion.p className="hint" style={{ margin: 0 }} {...line(3)}>
                {t("demo.due")} {formatDate(result.due_date, locale)}
              </motion.p>
            )}
            {result.cta_message && (
              <motion.div className="try-demo-cta" {...line(4)}>
                <span className="mock-label">{t("demo.ctaLine")}</span>
                <p>{result.cta_message}</p>
              </motion.div>
            )}
          </div>
          <motion.div className="try-demo-actions" {...line(5)}>
            {/* The sentence goes with them. Without this the visitor writes it
                here, signs up, and is handed an empty box to type it again. */}
            <Link href="/signup" className="btn btn-primary" onClick={keepDraft}>
              {t("demo.publish")}
            </Link>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              {t("demo.again")}
            </button>
          </motion.div>
          <motion.p className="hint try-demo-keep" {...line(6)}>
            {t("demo.keepHint")}
          </motion.p>
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
            onKeyDown={onKeyDown}
            placeholder={t("demo.placeholder")}
          />
          <div className="try-demo-examples">
            <span className="hint">{t("demo.tryThis")}</span>
            {EXAMPLES[lang].map((example) => (
              <button
                key={example.label}
                type="button"
                className="chip"
                title={example.text}
                onClick={() => setText(example.text)}
              >
                {example.label}
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

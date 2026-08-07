"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/money";
import { appText } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import LangToggle from "@/components/LangToggle";
import type { PublicInvoice } from "@/lib/invoice-server";

// Receives the invoice already resolved on the server: no loading shell, no
// blank first paint for a client opening the link on mobile data.
export default function InvoiceClient({ invoice: initial }: { invoice: PublicInvoice }) {
  const publicId = initial.public_id;
  const lang = useLang();
  const t = (k: string, v?: Record<string, string>) => appText(lang, k, v);
  const locale = lang === "id" ? "id-ID" : "en-US";

  const [invoice, setInvoice] = useState<PublicInvoice>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function trackView() {
      try {
        const key = `involoop_viewed_${publicId}`;
        if (localStorage.getItem(key)) return;
        const res = await fetch("/api/invoices/view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_id: publicId }),
        });
        if (res.ok) localStorage.setItem(key, "1");
      } catch {
        // silent · counting a view is best-effort, never blocks the page
      }
    }
    trackView();
  }, [publicId]);

  async function handlePay() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId, lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setError(data.error ?? t("invoice.checkoutFailed"));
    setSubmitting(false);
  }

  async function handleConfirmTransfer() {
    // Irreversible from the client's side and visible to the sender, so it
    // asks first instead of firing on a stray tap.
    if (!window.confirm(t("invoice.confirmTransferAsk"))) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/invoices/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId, lang }),
    });
    if (res.ok) {
      setInvoice((prev) => ({ ...prev, status: "awaiting_verification" }));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("invoice.confirmFailed"));
    }
    setSubmitting(false);
  }

  async function trackClick() {
    try {
      await fetch("/api/referrals/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: publicId }),
      });
    } catch {
      // best-effort
    }
    window.location.href = `/signup?ref_invoice=${publicId}`;
  }

  const paidStatus = invoice.status === "paid";
  const money = formatMoney(invoice.amount, invoice.currency, locale);

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
        <LangToggle />
      </nav>

      <main className="pay-layout">
        <div className="card">
          <div className="invoice-head">
            <div>
              <p className="invoice-label">{t("invoice.from")}</p>
              <h1 className="invoice-title">{invoice.sender_name}</h1>
            </div>
            <div className="invoice-meta">
              <p className="invoice-label">NO. {invoice.number}</p>
              <span className="hint">{formatDate(invoice.created_at, locale)}</span>
            </div>
          </div>

          <p className="invoice-label" style={{ marginTop: 24 }}>{t("invoice.to")}</p>
          <h2 className="invoice-client">{invoice.client_name}</h2>

          <p className="invoice-desc">{invoice.description}</p>

          <div className="invoice-amount" style={{ marginTop: 24 }}>{money}</div>
          {invoice.due_date && (
            <p className="hint" style={{ margin: "6px 0 0" }}>
              {t("invoice.dueDate")} {formatDate(invoice.due_date, locale)}
            </p>
          )}
        </div>

        <div className="pay-side" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="pay-panel card">
            {paidStatus ? (
              <div className="pay-status pay-status-paid">{t("invoice.paid")}</div>
            ) : invoice.status === "awaiting_verification" ? (
              <>
                <div className="pay-status pay-status-warn">{t("invoice.awaiting")}</div>
                <p className="hint" style={{ margin: 0 }}>{t("invoice.awaitingHint")}</p>
              </>
            ) : invoice.status === "payment_pending" ? (
              <div className="pay-status pay-status-warn">{t("invoice.pending")}</div>
            ) : (
              <>
                <div className="pay-status pay-status-open">
                  <span>{t("invoice.unpaid")}</span>
                  <span>{money}</span>
                </div>
                <div className="pay-options">
                  {invoice.paypal_enabled && (
                    <>
                      <button
                        onClick={handlePay}
                        disabled={submitting}
                        className="btn btn-primary btn-lg btn-mobile-full"
                      >
                        {submitting ? t("invoice.redirecting") : t("invoice.payPaypal")}
                      </button>
                      <p className="hint" style={{ textAlign: "center", margin: 0 }}>
                        {t("invoice.payHint")}
                      </p>
                      <div className="pay-divider">{t("invoice.orManual")}</div>
                    </>
                  )}
                  <div className="pay-instruction" style={{ marginBottom: 0 }}>
                    <p>{t("invoice.manualTitle")}</p>
                    <span>{t("invoice.manualBody", { sender: invoice.sender_name })}</span>
                  </div>
                  <button
                    onClick={handleConfirmTransfer}
                    disabled={submitting}
                    className="btn btn-ghost btn-lg btn-mobile-full"
                  >
                    {submitting ? t("invoice.sending") : t("invoice.confirmTransfer")}
                  </button>
                </div>
                <span className="test-badge" style={{ margin: 0, textAlign: "center" }}>
                  {t("invoice.testBadge")}
                </span>
              </>
            )}
            {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
          </div>

          {/* The document, for forwarding. A client sends this to whoever
              actually pays, and the referral goes with it. */}
          <a
            className="btn btn-ghost btn-mobile-full"
            href={`/invoice/${publicId}/pdf?lang=${lang}`}
            download
          >
            {t("invoice.downloadPdf")}
          </a>

          {invoice.cta_message && (
            <div className="card" style={{ padding: 22, textAlign: "center" }}>
              <h3 className="referral-heading">{t("invoice.referralHeading")}</h3>
              <p className="hint" style={{ margin: "8px 0 12px" }}>{invoice.cta_message}</p>
              <button onClick={trackClick} className="referral-link link-btn">
                {t("invoice.referralCta")}
              </button>
            </div>
          )}
        </div>
      </main>

      <p className="hint" style={{ textAlign: "center", marginBottom: 40 }}>
        {t("common.madeWith").replace("Involoop ·", "")} <Link href="/">Involoop</Link>
      </p>
    </>
  );
}

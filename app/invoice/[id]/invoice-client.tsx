"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/money";
import { appText } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import LangToggle from "@/components/LangToggle";
import type { PublicInvoice } from "@/lib/invoice-server";
import PayPalButtons from "@/components/PayPalButtons";
import CryptoPayPanel from "@/components/CryptoPayPanel";
import UsdcMark from "@/components/UsdcMark";
import { cryptoLabels } from "@/lib/crypto-labels";

// Receives the invoice already resolved on the server: no loading shell, no
// blank first paint for a client opening the link on mobile data.
export default function InvoiceClient({ invoice: initial }: { invoice: PublicInvoice }) {
  const publicId = initial.public_id;
  const lang = useLang();
  const t = (k: string, v?: Record<string, string>) => appText(lang, k, v);
  const locale = lang === "id" ? "id-ID" : "en-US";

  const [invoice, setInvoice] = useState<PublicInvoice>(initial);
  const [submitting, setSubmitting] = useState(false);
  const paidOrderRef = useRef<string | null>(null);
  const [payWith, setPayWith] = useState<"card" | "usdc">("card");
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

  // Handed to the PayPal buttons: they call this when the client commits, and
  // the order is created server-side from the database amount.
  async function createPaypalOrder(): Promise<string> {
    setError(null);
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId, lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) {
      const message = data.error ?? t("invoice.checkoutFailed");
      setError(message);
      throw new Error(message);
    }
    return data.id;
  }

  function handlePaid() {
    // The capture already succeeded server-side. Reflect it here rather than
    // making the client reload to find out whether their money went through.
    setInvoice((prev) => ({ ...prev, status: "paid" }));
    window.location.href = "/payment/success?order=" + encodeURIComponent(paidOrderRef.current ?? "");
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
        {/* The same document the PDF prints: letterhead, who it is for, the work
            as a line item, then a total under a rule. It used to be a headline
            and a loose price, which read as a web page about an invoice rather
            than the invoice itself — and left the column half empty next to the
            tall payment panel. */}
        <div className="pay-doc-col">
        <div className="card invoice-doc">
          <header className="invoice-head">
            <div className="invoice-from">
              <p className="invoice-label">{t("invoice.from")}</p>
              <h1 className="invoice-title">{invoice.sender_name}</h1>
            </div>
            <div className="invoice-meta">
              <p className="invoice-label">{t("invoice.docLabel")}</p>
              <strong className="invoice-number">{invoice.number}</strong>
              <span className="hint">{formatDate(invoice.created_at, locale)}</span>
            </div>
          </header>

          <div className="invoice-rule" />

          <p className="invoice-label">{t("invoice.to")}</p>
          <h2 className="invoice-client">{invoice.client_name}</h2>

          <div className="invoice-items">
            <div className="invoice-items-head">
              <span className="invoice-label">{t("invoice.description")}</span>
              <span className="invoice-label">{t("invoice.amount")}</span>
            </div>
            <div className="invoice-item">
              <p>{invoice.description}</p>
              <span>{money}</span>
            </div>
          </div>

          <div className="invoice-total">
            <span className="invoice-label">{t("invoice.total")}</span>
            <strong className="invoice-amount">{money}</strong>
          </div>

          {invoice.due_date && (
            <p className="hint invoice-due">
              {t("invoice.dueDate")} {formatDate(invoice.due_date, locale)}
            </p>
          )}
        </div>

          {/* The PDF belongs with the document, not under the payment buttons —
              it is the same invoice, in a form you can forward. */}
          <a
            className="btn btn-ghost btn-mobile-full"
            href={`/invoice/${publicId}/pdf?lang=${lang}`}
            download
          >
            {t("invoice.downloadPdf")}
          </a>
        </div>

        <div className="pay-side" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="pay-panel card">
            {/* payment_pending means an order was created and not finished —
                the client opened PayPal and closed it, or the card was declined.
                It used to render a dead "pending" panel with no way forward,
                which stranded anyone who changed their mind mid-checkout. They
                still owe the money, so they still get the buttons. */}
            {paidStatus ? (
              <div className="pay-status pay-status-paid">{t("invoice.paid")}</div>
            ) : invoice.status === "awaiting_verification" ? (
              <>
                <div className="pay-status pay-status-warn">{t("invoice.awaiting")}</div>
                <p className="hint" style={{ margin: 0 }}>{t("invoice.awaitingHint")}</p>
              </>
            ) : (
              <>
                <div className="pay-status pay-status-open">
                  <span>{t("invoice.unpaid")}</span>
                  <span>{money}</span>
                </div>
                <div className="pay-options">
                  {payWith === "usdc" ? (
                    <>
                      <CryptoPayPanel
                        create={async () => {
                          const res = await fetch("/api/payments/crypto", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ public_id: publicId, lang }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error ?? t("invoice.checkoutFailed"));
                          return data;
                        }}
                        labels={cryptoLabels(lang)}
                        onConfirmed={() => setInvoice((prev) => ({ ...prev, status: "paid" }))}
                      />
                      <button type="button" className="link-btn" onClick={() => setPayWith("card")}>
                        {t("invoice.payUsdcBack")}
                      </button>
                    </>
                  ) : invoice.paypal_enabled ? (
                    <>
                      <PayPalButtons
                        currency={invoice.currency}
                        lang={lang}
                        createOrder={createPaypalOrder}
                        onApproved={(orderId) => {
                          paidOrderRef.current = orderId;
                          handlePaid();
                        }}
                        onError={(message) => setError(message)}
                        labelLoading={t("invoice.payLoading")}
                        labelUnavailable={t("invoice.payUnavailable")}
                        labelDeclined={t("invoice.payDeclined")}
                        labelPending={t("invoice.payPending")}
                        disabled={submitting}
                      />
                      <p className="hint" style={{ textAlign: "center", margin: 0 }}>
                        {t("invoice.payHint")}
                      </p>

                      {/* Offered, not pushed. Most clients opening an invoice do
                          not have a wallet and do not want one; the ones who do
                          will find this. */}
                      {invoice.crypto_enabled && (
                        <button type="button" className="crypto-switch" onClick={() => setPayWith("usdc")}>
                          <UsdcMark />
                          <span className="crypto-switch-text">
                            <strong>{t("invoice.payUsdc")}</strong>
                            <span className="hint">{t("invoice.payUsdcSub")}</span>
                          </span>
                        </button>
                      )}

                      <div className="pay-divider">{t("invoice.orManual")}</div>
                    </>
                  ) : (
                    /* PayPal does not settle this currency, so the only honest
                       thing to show is the transfer route. */
                    <p className="hint" style={{ margin: 0 }}>
                      {t("invoice.payCurrencyUnsupported", { currency: invoice.currency })}
                    </p>
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
                  {t(
                    invoice.crypto_network === "solana-mainnet"
                      ? "invoice.cryptoLiveBadge"
                      : invoice.crypto_enabled
                        ? "invoice.testBadgeBoth"
                        : "invoice.testBadge"
                  )}
                </span>
              </>
            )}
            {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
          </div>

        </div>

        {invoice.cta_message && (
          <div className="card invoice-referral">
            <div>
              <h3 className="referral-heading">{t("invoice.referralHeading")}</h3>
              <p className="hint">{invoice.cta_message}</p>
            </div>
            <button onClick={trackClick} className="referral-link link-btn">
              {t("invoice.referralCta")}
            </button>
          </div>
        )}
      </main>

      <p className="hint" style={{ textAlign: "center", marginBottom: 40 }}>
        {t("common.madeWith").replace("Involoop ·", "")} <Link href="/">Involoop</Link>
      </p>
    </>
  );
}

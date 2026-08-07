"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/money";
import { appText } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";
import LangToggle from "@/components/LangToggle";

export default function PaymentSuccess({ sessionId }: { sessionId: string | null }) {
  const lang = useLang();
  const t = (k: string) => appText(lang, k);
  const [data, setData] = useState<null | {
    payment: { status: string; provider_payment_id: string | null; paid_at: string | null; amount_minor: number; currency: string };
    invoice: { public_id: string; number: string; client_name: string; amount: number; currency: string; status: string };
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!sessionId) {
        setError(t("success.missingSession"));
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/payments/session?order=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? t("success.notFound"));
      }
      setLoading(false);
    }
    load();
  }, [sessionId]);

  if (loading) return <main className="centered">{t("common.loading")}</main>;

  // A payments row exists from the moment an order is created, long before any
  // money moves. This page used to render "Payment successful" for any row it
  // found, which meant an approved-but-uncaptured order — a declined card, a
  // capture that never completed — was reported to the payer as done.
  const status = data?.payment.status;
  const paid = status === "succeeded";
  const pending = status === "created" || status === "processing";

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
        <LangToggle />
      </nav>
      <main className="invoice-card">
        <div className="card" style={{ textAlign: "center" }}>
          {error ? (
            <>
              <h1 className="invoice-title">{t("success.unknownTitle")}</h1>
              <p className="muted">{error}</p>
              <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>
                {t("success.back")}
              </Link>
            </>
          ) : !paid ? (
            <>
              <div className={pending ? "pay-status pay-status-warn" : "pay-status pay-status-open"}>
                {pending ? t("success.pendingTitle") : t("success.failedTitle")}
              </div>
              <h1 className="invoice-title money" style={{ marginTop: 18 }}>
                {formatMoney(data!.payment.amount_minor, data!.payment.currency, lang === "id" ? "id-ID" : "en-US", true)}
              </h1>
              <p className="muted">{t("success.invoiceLabel")} {data!.invoice.number} · {data!.invoice.client_name}</p>
              <p className="hint" style={{ margin: "12px auto 0", maxWidth: 380 }}>
                {pending ? t("success.pendingBody") : t("success.failedBody")}
              </p>
              <div className="success-actions">
                <Link href={`/invoice/${data!.invoice.public_id}`} className="btn btn-primary">
                  {t("success.openInvoice")}
                </Link>
                {pending && (
                  <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
                    {t("success.refresh")}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="paid-banner">{t("success.successful")}</div>
              <h1 className="invoice-title money" style={{ marginTop: 18 }}>
                {formatMoney(data!.payment.amount_minor, data!.payment.currency, lang === "id" ? "id-ID" : "en-US", true)}
              </h1>
              <p className="muted">{t("success.invoiceLabel")} {data!.invoice.number} · {data!.invoice.client_name}</p>
              <p className="hint" style={{ marginTop: 8 }}>
                {t("success.verifiedBy")}
                {data!.payment.provider_payment_id && (
                  <>
                    <br />
                    {t("success.transactionId")} <span className="mono">{data!.payment.provider_payment_id}</span>
                  </>
                )}
                {data!.payment.paid_at && (
                  <>
                    <br />
                    {t("success.paidAt")} {formatDate(data!.payment.paid_at, lang === "id" ? "id-ID" : "en-US")}
                  </>
                )}
              </p>

              {/* The moment a client is most likely to want the document:
                  right after paying, for their own records. */}
              <div className="success-actions">
                <a
                  className="btn btn-primary"
                  href={`/invoice/${data!.invoice.public_id}/pdf?lang=${lang}`}
                  download
                >
                  ↓ {t("success.downloadPdf")}
                </a>
                <Link href={`/invoice/${data!.invoice.public_id}`} className="btn btn-ghost">
                  {t("success.openInvoice")}
                </Link>
              </div>

              <div className="referral-box">
                <h3 className="referral-heading">{t("success.referralHeading")}</h3>
                <p>{t("success.referralBody")}</p>
                <Link
                  href={`/signup?ref_invoice=${data!.invoice.public_id}`}
                  className="referral-link"
                >
                  {t("success.referralCta")}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

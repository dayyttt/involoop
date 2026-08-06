"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/money";

function Success() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [data, setData] = useState<null | {
    payment: { status: string; provider_payment_id: string | null; paid_at: string | null; amount_minor: number; currency: string };
    invoice: { public_id: string; number: string; client_name: string; amount: number; currency: string; status: string };
  }>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!sessionId) {
        setError("Missing payment session.");
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/payments/session?session_id=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Payment session not found.");
      }
      setLoading(false);
    }
    load();
  }, [sessionId]);

  if (loading) return <main className="centered">Loading…</main>;

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
      </nav>
      <main className="invoice-card">
        <div className="card" style={{ textAlign: "center" }}>
          {error ? (
            <>
              <h1 className="invoice-title">Payment status unknown</h1>
              <p className="muted">{error}</p>
              <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>
                Back to Involoop
              </Link>
            </>
          ) : (
            <>
              <div className="paid-banner">Payment successful ✓</div>
              <h1 className="invoice-title" style={{ marginTop: 18 }}>
                {formatMoney(data!.payment.amount_minor, data!.payment.currency, "en-US", true)}
              </h1>
              <p className="muted">Invoice {data!.invoice.number} — {data!.invoice.client_name}</p>
              <p className="hint" style={{ marginTop: 8 }}>
                Payment verified by Stripe
                {data!.payment.provider_payment_id && (
                  <>
                    <br />
                    Transaction ID: {data!.payment.provider_payment_id}
                  </>
                )}
                {data!.payment.paid_at && (
                  <>
                    <br />
                    Paid at: {formatDate(data!.payment.paid_at)}
                  </>
                )}
              </p>

              <div className="referral-box">
                <h3 className="referral-heading">Create your own invoice — get free credits</h3>
                <p>
                  Join through this invoice and receive credits to publish your
                  first invoices.
                </p>
                <a
                  href={`/signup?ref_invoice=${data!.invoice.public_id}`}
                  className="referral-link"
                >
                  Create your own invoice →
                </a>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<main className="centered">Loading…</main>}>
      <Success />
    </Suspense>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/money";

interface InvoiceData {
  public_id: string;
  number: string;
  client_name: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  cta_message: string | null;
  due_date: string | null;
  created_at: string;
  sender_name: string;
  stripe_enabled?: boolean;
}

export default function PublicInvoice() {
  const params = useParams();
  const publicId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/invoices/${publicId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data.invoice);
        trackView();
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId]);

  async function trackView() {
    try {
      if (typeof window === "undefined") return;
      const key = `involoop_viewed_${publicId}`;
      if (localStorage.getItem(key)) return;
      const res = await fetch("/api/invoices/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: publicId }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(key, "1");
        setInvoice((prev) => (prev ? { ...prev, views: data.views } : prev));
      }
    } catch {
      // silent — counting a view is best-effort, never blocks the page
    }
  }

  async function handlePay() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) {
      window.location.href = data.url;
      return;
    }
    setError(data.error ?? "Gagal membuat sesi pembayaran.");
    setSubmitting(false);
  }

  async function handleConfirmTransfer() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/invoices/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId }),
    });
    if (res.ok) {
      setInvoice((prev) =>
        prev ? { ...prev, status: "awaiting_verification" } : prev
      );
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
    }
    setSubmitting(false);
  }

  if (loading)
    return (
      <>
        <nav className="nav">
          <Link href="/" className="brand">
            Invo<span className="brand-accent">loop</span>
          </Link>
        </nav>
        <main className="centered">Memuat...</main>
      </>
    );
  if (!invoice)
    return (
      <>
        <nav className="nav">
          <Link href="/" className="brand">
            Invo<span className="brand-accent">loop</span>
          </Link>
        </nav>
        <main className="centered">Invoice tidak ditemukan.</main>
      </>
    );

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

  const signupUrl = `/signup?ref_invoice=${invoice.public_id}`;

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
      </nav>

      <main className="invoice-card">
        <div className="card">
          <div className="invoice-head">
            <div>
              <p className="invoice-label">FROM</p>
              <h1 className="invoice-title">{invoice.sender_name}</h1>
            </div>
            <div className="invoice-meta">
              <p className="invoice-label">NO. {invoice.number}</p>
              <span className="hint">{formatDate(invoice.created_at)}</span>
            </div>
          </div>

          <p className="invoice-label" style={{ marginTop: 20 }}>TO</p>
          <h2 className="invoice-client">{invoice.client_name}</h2>

          <p className="invoice-desc">{invoice.description}</p>

          <div className="invoice-amount">
            {formatMoney(invoice.amount, invoice.currency)}
          </div>
          {invoice.due_date && (
            <p className="hint" style={{ margin: "2px 0 20px" }}>
              {formatDate(invoice.due_date)}
            </p>
          )}

          {invoice.status === "paid" ? (
            <div className="paid-banner">Payment received ✓</div>
          ) : invoice.status === "awaiting_verification" ? (
            <div className="paid-banner">Awaiting sender verification</div>
          ) : invoice.status === "payment_pending" ? (
            <div className="paid-banner">Payment in progress…</div>
          ) : (
            <>
              {invoice.stripe_enabled && (
                <>
                  <button
                    onClick={handlePay}
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ width: "100%", padding: 14, fontSize: 16 }}
                  >
                    {submitting ? "Mengarahkan ke Stripe…" : "Pay securely"}
                  </button>
                  <p className="hint" style={{ textAlign: "center", margin: "8px 0 0" }}>
                    Payment is securely processed by Stripe. Involoop does not
                    store card information.
                  </p>
                  <p className="test-badge">Stripe Test Mode — no real money will be charged</p>
                </>
              )}
              <div className="pay-instruction">
                <p>Manual payment</p>
                <span>
                  Transfer to the account you agreed with {invoice.sender_name},
                  then confirm below.
                </span>
              </div>
              <button
                onClick={handleConfirmTransfer}
                disabled={submitting}
                className="btn btn-ghost"
                style={{ width: "100%", padding: 14, fontSize: 15 }}
              >
                {submitting ? "Sending confirmation…" : "I have completed the transfer"}
              </button>
            </>
          )}
          {error && <p className="error">{error}</p>}

          {invoice.cta_message && (
            <div className="referral-box">
              <h3 className="referral-heading">Create an invoice like this — free</h3>
              <p>{invoice.cta_message}</p>
              <button onClick={trackClick} className="referral-link link-btn">
                Get 5 free credits when you join through this invoice →
              </button>
            </div>
          )}
        </div>

        <p className="hint" style={{ textAlign: "center", marginTop: 16 }}>
          Made with <Link href="/">Involoop</Link> · invoices that bring your next user
        </p>
      </main>
    </>
  );
}

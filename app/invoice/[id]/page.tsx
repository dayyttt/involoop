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
  const paidStatus = invoice.status === "paid";

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Invo<span className="brand-accent">loop</span>
        </Link>
      </nav>

      <main className="pay-layout">
        <div className="card">
          <div className="invoice-head">
            <div>
              <p className="invoice-label">DARI</p>
              <h1 className="invoice-title">{invoice.sender_name}</h1>
            </div>
            <div className="invoice-meta">
              <p className="invoice-label">NO. {invoice.number}</p>
              <span className="hint">{formatDate(invoice.created_at)}</span>
            </div>
          </div>

          <p className="invoice-label" style={{ marginTop: 24 }}>UNTUK</p>
          <h2 className="invoice-client">{invoice.client_name}</h2>

          <p className="invoice-desc">{invoice.description}</p>

          <div className="invoice-amount" style={{ marginTop: 24 }}>
            {formatMoney(invoice.amount, invoice.currency)}
          </div>
          {invoice.due_date && (
            <p className="hint" style={{ margin: "6px 0 0" }}>
              Jatuh tempo {formatDate(invoice.due_date)}
            </p>
          )}
        </div>

        <div className="pay-side" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="pay-panel card">
            {paidStatus ? (
              <div className="pay-status pay-status-paid">✓ Pembayaran diterima</div>
            ) : invoice.status === "awaiting_verification" ? (
              <div className="pay-status pay-status-warn">Menunggu verifikasi pengirim</div>
            ) : invoice.status === "payment_pending" ? (
              <div className="pay-status pay-status-warn">Pembayaran sedang diproses…</div>
            ) : (
              <>
                <div className="pay-status pay-status-open">
                  <span>Belum dibayar</span>
                  <span>{formatMoney(invoice.amount, invoice.currency)}</span>
                </div>
                <div className="pay-options">
                  {invoice.stripe_enabled && (
                    <>
                      <button
                        onClick={handlePay}
                        disabled={submitting}
                        className="btn btn-primary btn-lg btn-mobile-full"
                      >
                        {submitting ? "Mengarahkan ke Stripe…" : "Bayar dengan Stripe"}
                      </button>
                      <p className="hint" style={{ textAlign: "center", margin: 0 }}>
                        Pembayaran diproses aman oleh Stripe. Involoop tidak
                        menyimpan data kartu.
                      </p>
                    </>
                  )}
                  {invoice.stripe_enabled && (
                    <div className="pay-divider">atau transfer manual</div>
                  )}
                  <div className="pay-instruction" style={{ marginBottom: 0 }}>
                    <p>Transfer manual</p>
                    <span>
                      Transfer ke rekening yang disepakati dengan {invoice.sender_name},
                      lalu konfirmasi di bawah.
                    </span>
                  </div>
                  <button
                    onClick={handleConfirmTransfer}
                    disabled={submitting}
                    className="btn btn-ghost btn-lg btn-mobile-full"
                  >
                    {submitting ? "Mengirim konfirmasi…" : "Saya sudah transfer"}
                  </button>
                </div>
                <span className="test-badge" style={{ margin: 0, textAlign: "center" }}>
                  Stripe Test Mode — tidak ada uang asli yang ditarik
                </span>
              </>
            )}
            {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
          </div>

          {invoice.cta_message && (
            <div className="card" style={{ padding: 22, textAlign: "center" }}>
              <h3 className="referral-heading">Buat invoice seperti ini — gratis</h3>
              <p className="hint" style={{ margin: "8px 0 12px" }}>{invoice.cta_message}</p>
              <button onClick={trackClick} className="referral-link link-btn">
                Dapatkan 5 kredit gratis saat kamu bergabung lewat invoice ini →
              </button>
            </div>
          )}
        </div>
      </main>

      <p className="hint" style={{ textAlign: "center", marginBottom: 40 }}>
        Dibuat dengan <Link href="/">Involoop</Link> · invoice yang mendatangkan pengguna berikutnya
      </p>
    </>
  );
}

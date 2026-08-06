"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
      }
      setLoading(false);
    }
    load();
  }, [publicId]);

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
              <p className="invoice-label">DARI</p>
              <h1 className="invoice-title">{invoice.sender_name}</h1>
            </div>
            <div className="invoice-meta">
              <p className="invoice-label">NO. {invoice.number}</p>
              <span className="hint">
                Dibuat {new Date(invoice.created_at).toLocaleDateString("id-ID")}
              </span>
            </div>
          </div>

          <p className="invoice-label" style={{ marginTop: 20 }}>UNTUK</p>
          <h2 className="invoice-client">{invoice.client_name}</h2>

          <p className="invoice-desc">{invoice.description}</p>

          <div className="invoice-amount">
            {invoice.currency === "IDR" ? "Rp " : ""}
            {invoice.amount.toLocaleString("id-ID")}
          </div>
          {invoice.due_date && (
            <p className="hint" style={{ margin: "2px 0 20px" }}>
              Jatuh tempo: {new Date(invoice.due_date).toLocaleDateString("id-ID")}
            </p>
          )}

          {invoice.status === "paid" ? (
            <div className="paid-banner">Pembayaran diterima ✓</div>
          ) : invoice.status === "awaiting_verification" ? (
            <div className="paid-banner">Menunggu verifikasi pengirim</div>
          ) : (
            <>
              <div className="pay-instruction">
                <p>Instruksi pembayaran</p>
                <span>
                  Transfer ke rekening sesuai kesepakatan dengan{" "}
                  {invoice.sender_name}, lalu konfirmasi di bawah ini.
                </span>
              </div>
              <button
                onClick={handleConfirmTransfer}
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: "100%", padding: 14, fontSize: 16 }}
              >
                {submitting ? "Mengirim konfirmasi..." : "Saya sudah transfer"}
              </button>
            </>
          )}
          {error && <p className="error">{error}</p>}

          {invoice.cta_message && (
            <div className="referral-box">
              <h3 className="referral-heading">Buat invoice seperti ini — gratis</h3>
              <p>{invoice.cta_message}</p>
              <a href={signupUrl} className="referral-link">
                Dapatkan 5 kredit saat bergabung melalui invoice ini →
              </a>
            </div>
          )}
        </div>

        <p className="hint" style={{ textAlign: "center", marginTop: 16 }}>
          Dibuat dengan <Link href="/">Involoop</Link> · invoice yang menyebar sendiri
        </p>
      </main>
    </>
  );
}

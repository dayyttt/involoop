"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface InvoiceData {
  public_id: string;
  client_name: string;
  description: string;
  amount: number;
  status: string;
  cta_message: string | null;
  due_date: string | null;
}

export default function PublicInvoice() {
  const params = useParams();
  const publicId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

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

  async function handlePay() {
    setPaying(true);
    setPayError(null);
    const res = await fetch("/api/invoices/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId }),
    });
    if (res.ok) {
      setInvoice((prev) => (prev ? { ...prev, status: "paid" } : prev));
    } else {
      const data = await res.json().catch(() => ({}));
      setPayError(data.error ?? "Terjadi kesalahan saat membayar. Coba lagi.");
    }
    setPaying(false);
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
          <p className="invoice-label">Tagihan untuk</p>
          <h1 className="invoice-title">{invoice.client_name}</h1>

          <p className="invoice-desc">{invoice.description}</p>

          <div className="invoice-amount">
            Rp {invoice.amount.toLocaleString("id-ID")}
          </div>
          {invoice.due_date && (
            <p className="hint" style={{ margin: "2px 0 20px" }}>
              Jatuh tempo: {new Date(invoice.due_date).toLocaleDateString("id-ID")}
            </p>
          )}

          {invoice.status === "paid" ? (
            <div className="paid-banner">Sudah dibayar</div>
          ) : (
            <button
              onClick={handlePay}
              disabled={paying}
              className="btn btn-primary"
              style={{ width: "100%", padding: 14, fontSize: 16 }}
            >
              {paying ? "Memproses..." : "Bayar sekarang"}
            </button>
          )}
          {payError && <p className="error">{payError}</p>}

          {/* Distribution mechanism: this line only exists because the client
              was already here to pay. It's not a separate promotion. */}
          {invoice.cta_message && (
            <div className="referral-box">
              <p>{invoice.cta_message}</p>
              <a href={signupUrl} className="referral-link">
                Coba gratis →
              </a>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

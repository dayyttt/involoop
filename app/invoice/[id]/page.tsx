"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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
    const res = await fetch("/api/invoices/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId }),
    });
    if (res.ok) {
      setInvoice((prev) => (prev ? { ...prev, status: "paid" } : prev));
    }
    setPaying(false);
  }

  if (loading) return <main style={{ padding: 40 }}>Memuat...</main>;
  if (!invoice) return <main style={{ padding: 40 }}>Invoice tidak ditemukan.</main>;

  const signupUrl = `/signup?ref_invoice=${invoice.public_id}`;

  return (
    <main style={{ maxWidth: 480, margin: "60px auto", padding: "0 20px" }}>
      <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 24 }}>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>Tagihan untuk</p>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>{invoice.client_name}</h1>

        <p style={{ color: "#444", marginBottom: 16 }}>{invoice.description}</p>

        <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
          Rp {invoice.amount.toLocaleString("id-ID")}
        </div>
        {invoice.due_date && (
          <p style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
            Jatuh tempo: {new Date(invoice.due_date).toLocaleDateString("id-ID")}
          </p>
        )}

        {invoice.status === "paid" ? (
          <div style={{ padding: 12, background: "#f2fbf3", borderRadius: 8, color: "#1a7f37", textAlign: "center" }}>
            Sudah dibayar
          </div>
        ) : (
          <button
            onClick={handlePay}
            disabled={paying}
            style={{ width: "100%", padding: 14, background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, cursor: "pointer" }}
          >
            {paying ? "Memproses..." : "Bayar sekarang"}
          </button>
        )}

        {/* Distribution mechanism: this line only exists because the client
            was already here to pay. It's not a separate promotion. */}
        {invoice.cta_message && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>{invoice.cta_message}</p>
            <a href={signupUrl} style={{ fontSize: 13, color: "#111", fontWeight: 600, textDecoration: "underline" }}>
              Coba gratis →
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

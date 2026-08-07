import { ImageResponse } from "next/og";
import { getPublicInvoice } from "@/lib/invoice-server";
import { formatMoney } from "@/lib/money";

// A real preview card for the link that gets pasted into WhatsApp: sender,
// client, amount, status. This is the cheapest advertising the loop has.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Involoop invoice";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const invoice = await getPublicInvoice(params.id);

  const money = invoice ? formatMoney(invoice.amount, invoice.currency, "en-US") : "";
  const paid = invoice?.status === "paid";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#100d12",
          color: "#fbf8fb",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                background: "#f14a94",
                border: "6px solid #f39a3f",
              }}
            />
            <div style={{ fontSize: 34, fontWeight: 800 }}>Involoop</div>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              fontSize: 24,
              fontWeight: 700,
              background: paid ? "rgba(72,215,160,.14)" : "rgba(244,189,85,.14)",
              color: paid ? "#48d7a0" : "#f4bd55",
            }}
          >
            {invoice ? (paid ? "PAID" : "UNPAID") : "INVOICE"}
          </div>
        </div>

        {invoice ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* Satori needs one child per div unless the div is explicitly a
                flex container, so every line is a single interpolated string. */}
            <div style={{ fontSize: 26, color: "#887e89", letterSpacing: 2 }}>
              {`FROM ${invoice.sender_name.toUpperCase()}`}
            </div>
            <div style={{ fontSize: 96, fontWeight: 800, marginTop: 12, lineHeight: 1.05 }}>{money}</div>
            <div style={{ fontSize: 34, color: "#b9afb9", marginTop: 18 }}>{invoice.description}</div>
            <div style={{ fontSize: 28, color: "#887e89", marginTop: 10 }}>
              {`For ${invoice.client_name} · ${invoice.number}`}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 64, fontWeight: 800 }}>Invoice not found</div>
        )}

        <div style={{ display: "flex", fontSize: 26, color: "#f14a94", fontWeight: 700 }}>
          Open the link to pay or confirm a transfer →
        </div>
      </div>
    ),
    size
  );
}

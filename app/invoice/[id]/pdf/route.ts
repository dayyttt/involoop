import { NextRequest, NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getPublicInvoice } from "@/lib/invoice-server";
import { formatMoney, formatDate } from "@/lib/money";

// A PDF of the invoice, carrying the sender's name as the letterhead and the
// referral invitation in the footer.
//
// This is the distribution mechanism reaching where a link cannot. A client
// forwards the PDF to their accountant, their manager, the person who actually
// pays — none of whom ever saw the original message. Every one of those copies
// still points back at the public invoice page, which is where the referral CTA
// lives, so the loop survives being forwarded.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLUM = "#241a2b";
const INK = "#1b1420";
const MUTED = "#6f6579";
const PINK = "#c2185b";
const LINE = "#e6e0ea";

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 44, paddingHorizontal: 48, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 19, fontFamily: "Helvetica-Bold", color: PLUM },
  brandNote: { fontSize: 9, color: MUTED, marginTop: 3 },
  metaRight: { alignItems: "flex-end" },
  label: { fontSize: 8, color: MUTED, letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  metaValue: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  status: { marginTop: 8, fontSize: 9, fontFamily: "Helvetica-Bold" },
  rule: { borderBottomWidth: 1, borderBottomColor: LINE, marginVertical: 26 },
  billTo: { marginBottom: 26 },
  client: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 4 },
  itemHead: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: LINE, paddingBottom: 7 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 13 },
  itemDesc: { fontSize: 11, maxWidth: 320 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 2, borderTopColor: PLUM, paddingTop: 13 },
  totalLabel: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 20, fontFamily: "Helvetica-Bold", color: PLUM },
  due: { fontSize: 9, color: MUTED, marginTop: 8 },
  referral: { marginTop: 34, padding: 16, borderWidth: 1, borderColor: LINE, borderRadius: 6, backgroundColor: "#faf7fb" },
  referralTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: PINK },
  referralBody: { fontSize: 9.5, color: INK, marginTop: 5, lineHeight: 1.5 },
  referralLink: { fontSize: 9, color: PINK, marginTop: 8, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", left: 48, right: 48, bottom: 26, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 8, color: MUTED },
});

const el = React.createElement;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const invoice = await getPublicInvoice(params.id);
  if (!invoice) return new NextResponse("Invoice not found", { status: 404 });

  const url = new URL(req.url);
  const id = url.searchParams.get("lang") === "id";
  const locale = id ? "id-ID" : "en-US";
  // Where this PDF was actually fetched from, so a copy downloaded from any
  // deployment points back at that deployment rather than at a configured guess.
  const origin = url.origin;
  const money = formatMoney(invoice.amount, invoice.currency, locale);
  const paid = invoice.status === "paid";

  const t = {
    invoice: id ? "INVOICE" : "INVOICE",
    number: id ? "NOMOR" : "NUMBER",
    issued: id ? "DITERBITKAN" : "ISSUED",
    billTo: id ? "DITAGIHKAN KEPADA" : "BILL TO",
    description: id ? "DESKRIPSI" : "DESCRIPTION",
    amount: id ? "JUMLAH" : "AMOUNT",
    total: id ? "TOTAL" : "TOTAL",
    due: id ? "Jatuh tempo" : "Due",
    paid: id ? "LUNAS" : "PAID",
    unpaid: id ? "BELUM DIBAYAR" : "UNPAID",
    refTitle: id ? "Buat invoice seperti ini, gratis" : "Create an invoice like this, free",
    refFallback: id
      ? "Tulis satu kalimat, dapat link tagihan yang bisa dikirim ke mana saja."
      : "Write one sentence, get a payment link you can send anywhere.",
    open: id ? "Buka dan bayar di:" : "View and pay at:",
    madeWith: id ? "Dibuat dengan Involoop" : "Made with Involoop",
    testMode: id ? "PayPal Sandbox — tidak ada uang asli yang ditarik" : "PayPal Sandbox — no real money is charged",
  };

  const doc = el(
    Document,
    { title: `${t.invoice} ${invoice.number}`, author: invoice.sender_name },
    el(
      Page,
      { size: "A4", style: styles.page },
      // Letterhead: the sender's own name, because this document is theirs.
      el(
        View,
        { style: styles.brandRow },
        el(
          View,
          null,
          el(Text, { style: styles.brand }, invoice.sender_name),
          el(Text, { style: styles.brandNote }, t.invoice)
        ),
        el(
          View,
          { style: styles.metaRight },
          el(Text, { style: styles.label }, t.number),
          el(Text, { style: styles.metaValue }, invoice.number),
          el(Text, { style: [styles.label, { marginTop: 10 }] }, t.issued),
          el(Text, { style: styles.metaValue }, formatDate(invoice.created_at, locale)),
          el(
            Text,
            { style: [styles.status, { color: paid ? "#12805c" : "#b26a00" }] },
            paid ? t.paid : t.unpaid
          )
        )
      ),
      el(View, { style: styles.rule }),
      el(
        View,
        { style: styles.billTo },
        el(Text, { style: styles.label }, t.billTo),
        el(Text, { style: styles.client }, invoice.client_name)
      ),
      el(
        View,
        { style: styles.itemHead },
        el(Text, { style: styles.label }, t.description),
        el(Text, { style: styles.label }, t.amount)
      ),
      el(
        View,
        { style: styles.itemRow },
        el(Text, { style: styles.itemDesc }, invoice.description),
        el(Text, { style: { fontSize: 11 } }, money)
      ),
      el(
        View,
        { style: styles.totalRow },
        el(Text, { style: styles.totalLabel }, t.total),
        el(Text, { style: styles.totalValue }, money)
      ),
      invoice.due_date
        ? el(Text, { style: styles.due }, `${t.due} ${formatDate(invoice.due_date, locale)}`)
        : null,

      // The loop, travelling with the document.
      el(
        View,
        { style: styles.referral },
        el(Text, { style: styles.referralTitle }, t.refTitle),
        el(Text, { style: styles.referralBody }, invoice.cta_message || t.refFallback),
        el(Text, { style: styles.referralLink }, `${t.open} ${origin}/invoice/${invoice.public_id}`)
      ),

      el(
        View,
        { style: styles.footer },
        el(Text, { style: styles.footerText }, t.madeWith),
        el(Text, { style: styles.footerText }, t.testMode)
      )
    )
  );

  const buffer = await renderToBuffer(doc as never);
  const filename = `${invoice.number}-${invoice.client_name}`.replace(/[^a-zA-Z0-9-]+/g, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

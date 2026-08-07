import { NextRequest, NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { getPublicInvoice } from "@/lib/invoice-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { formatMoney, formatDate } from "@/lib/money";

// The invoice as a document someone can file, forward, or hand to an accountant.
//
// Two jobs in one page. Before payment it is an invoice: who owes what, by when.
// After payment it is a receipt, and that is the version people actually keep —
// so a paid document carries the method, the transaction id and the date the
// money moved, which is the part an accountant asks for.
//
// It also carries the referral invitation, because a forwarded PDF reaches
// people who never saw the original link.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INK = "#1b1420";
const PLUM = "#241a2b";
const MUTED = "#6f6579";
const FAINT = "#9a91a2";
const PINK = "#c2185b";
const GREEN = "#0f7a56";
const AMBER = "#9a6300";
const LINE = "#e6e0ea";
const WASH = "#faf8fb";

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 54,
    paddingHorizontal: 0,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
  },
  // A single band of colour at the top edge. It is the only decoration in the
  // document and it does the whole job of making it look deliberate.
  band: { flexDirection: "row", height: 7 },
  bandPlum: { flex: 3, backgroundColor: PLUM },
  bandPink: { flex: 1, backgroundColor: PINK },

  body: { paddingHorizontal: 52, paddingTop: 40 },

  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sender: { fontSize: 20, fontFamily: "Helvetica-Bold", color: PLUM, maxWidth: 300 },
  senderNote: { fontSize: 8.5, color: MUTED, marginTop: 4, letterSpacing: 1.4 },

  metaBox: { alignItems: "flex-end" },
  label: { fontSize: 7.5, color: FAINT, letterSpacing: 1.1, fontFamily: "Helvetica-Bold" },
  metaValue: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 3 },

  // A status you can read across a desk, not a word in the corner.
  pill: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: 3,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.6,
  },
  pillPaid: { backgroundColor: "#e6f5ee", color: GREEN },
  pillOpen: { backgroundColor: "#fdf1dd", color: AMBER },

  rule: { borderBottomWidth: 1, borderBottomColor: LINE, marginTop: 26, marginBottom: 26 },

  parties: { flexDirection: "row", justifyContent: "space-between" },
  party: { maxWidth: 230 },
  partyName: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 5 },
  partyLine: { fontSize: 9.5, color: MUTED, marginTop: 3 },

  tableHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: PLUM,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14 },
  rowDesc: { fontSize: 10.5, maxWidth: 340, lineHeight: 1.45 },
  rowAmount: { fontSize: 10.5 },

  totals: { marginTop: 4, alignItems: "flex-end" },
  totalsInner: { width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  totalsLabel: { fontSize: 9.5, color: MUTED },
  totalsDivider: { borderTopWidth: 2, borderTopColor: PLUM, marginTop: 6, paddingTop: 10 },
  grandLabel: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  grandValue: { fontSize: 17, fontFamily: "Helvetica-Bold", color: PLUM },

  // The receipt half. Only present once money has actually moved.
  receipt: {
    marginTop: 30,
    padding: 16,
    borderRadius: 4,
    backgroundColor: "#f2faf6",
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  receiptTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: GREEN, letterSpacing: 0.5 },
  receiptGrid: { flexDirection: "row", marginTop: 10 },
  receiptCell: { flex: 1 },
  receiptKey: { fontSize: 7.5, color: MUTED, letterSpacing: 1 },
  receiptVal: { fontSize: 9.5, marginTop: 3 },

  notice: { marginTop: 26, fontSize: 9.5, color: MUTED, lineHeight: 1.5 },

  referral: {
    marginTop: 26,
    padding: 16,
    borderRadius: 4,
    backgroundColor: WASH,
    borderWidth: 1,
    borderColor: LINE,
  },
  referralTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: PLUM },
  referralBody: { fontSize: 9, color: MUTED, marginTop: 5, lineHeight: 1.5 },
  referralLink: { fontSize: 9, color: PINK, marginTop: 8, fontFamily: "Helvetica-Bold" },

  footer: {
    position: "absolute",
    left: 52,
    right: 52,
    bottom: 26,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: FAINT },
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

  // Only a settled payment turns this into a receipt. An order that exists but
  // never captured must never put a transaction id on a document.
  //
  // An invoice can also be paid by bank transfer that the sender confirmed by
  // hand, in which case there is no processor record at all — and printing
  // "Method: PayPal" over that would be a false statement about how money moved.
  let receipt: { id: string | null; paidAt: string | null; provider: string } | null = null;
  if (paid) {
    const { data, error } = await createAdminClient()
      .from("payments")
      .select("provider, provider_payment_id, paid_at, invoices!inner(public_id)")
      .eq("invoices.public_id", invoice.public_id)
      .eq("status", "succeeded")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error("pdf receipt lookup failed", error.message);
    if (data) {
      receipt = {
        id: data.provider_payment_id,
        paidAt: data.paid_at,
        provider: data.provider === "paypal" ? "PayPal" : "Stripe",
      };
    }
  }
  const method = receipt?.provider ?? (id ? "Transfer bank (dikonfirmasi pengirim)" : "Bank transfer (confirmed by sender)");
  const paidOn = receipt?.paidAt ?? invoice.paid_at;

  const t = {
    invoice: "INVOICE",
    number: id ? "NOMOR" : "NUMBER",
    issued: id ? "TERBIT" : "ISSUED",
    due: id ? "JATUH TEMPO" : "DUE",
    billTo: id ? "DITAGIHKAN KEPADA" : "BILL TO",
    description: id ? "DESKRIPSI" : "DESCRIPTION",
    amount: id ? "JUMLAH" : "AMOUNT",
    subtotal: "Subtotal",
    total: "TOTAL",
    paid: id ? "LUNAS" : "PAID",
    unpaid: id ? "BELUM DIBAYAR" : "UNPAID",
    receiptTitle: id ? "BUKTI PEMBAYARAN" : "PAYMENT RECEIPT",
    method: id ? "METODE" : "METHOD",
    txn: id ? "ID TRANSAKSI" : "TRANSACTION ID",
    paidOn: id ? "DIBAYAR" : "PAID ON",
    dueNotice: id
      ? "Mohon selesaikan pembayaran sebelum tanggal jatuh tempo di atas."
      : "Please settle this invoice by the due date shown above.",
    refTitle: id ? "Buat invoice seperti ini, gratis" : "Create an invoice like this, free",
    refFallback: id
      ? "Tulis satu kalimat, dapat link tagihan yang bisa dikirim ke mana saja."
      : "Write one sentence, get a payment link you can send anywhere.",
    open: id ? "Buka dan bayar di" : "View and pay at",
    madeWith: id ? "Dibuat dengan Involoop" : "Made with Involoop",
    testMode: id
      ? "PayPal Sandbox — tidak ada uang asli yang ditarik"
      : "PayPal Sandbox — no real money is charged",
  };

  const doc = el(
    Document,
    {
      title: `${t.invoice} ${invoice.number}`,
      author: invoice.sender_name,
      subject: `${invoice.number} · ${invoice.client_name}`,
    },
    el(
      Page,
      { size: "A4", style: styles.page },

      el(
        View,
        { style: styles.band },
        el(View, { style: styles.bandPlum }),
        el(View, { style: styles.bandPink })
      ),

      el(
        View,
        { style: styles.body },

        // Letterhead: the sender's own name, because this document is theirs.
        el(
          View,
          { style: styles.head },
          el(
            View,
            null,
            el(Text, { style: styles.sender }, invoice.sender_name),
            el(Text, { style: styles.senderNote }, t.invoice)
          ),
          el(
            View,
            { style: styles.metaBox },
            el(Text, { style: styles.label }, t.number),
            el(Text, { style: styles.metaValue }, invoice.number),
            el(
              Text,
              { style: [styles.pill, paid ? styles.pillPaid : styles.pillOpen] },
              paid ? t.paid : t.unpaid
            )
          )
        ),

        el(View, { style: styles.rule }),

        el(
          View,
          { style: styles.parties },
          el(
            View,
            { style: styles.party },
            el(Text, { style: styles.label }, t.billTo),
            el(Text, { style: styles.partyName }, invoice.client_name)
          ),
          el(
            View,
            { style: [styles.party, { alignItems: "flex-end" }] },
            el(Text, { style: styles.label }, t.issued),
            el(Text, { style: styles.partyLine }, formatDate(invoice.created_at, locale)),
            invoice.due_date
              ? el(
                  View,
                  { style: { alignItems: "flex-end", marginTop: 8 } },
                  el(Text, { style: styles.label }, t.due),
                  el(Text, { style: styles.partyLine }, formatDate(invoice.due_date, locale))
                )
              : null
          )
        ),

        el(
          View,
          { style: styles.tableHead },
          el(Text, { style: styles.label }, t.description),
          el(Text, { style: styles.label }, t.amount)
        ),
        el(
          View,
          { style: styles.row },
          el(Text, { style: styles.rowDesc }, invoice.description),
          el(Text, { style: styles.rowAmount }, money)
        ),

        el(
          View,
          { style: styles.totals },
          el(
            View,
            { style: styles.totalsInner },
            el(
              View,
              { style: styles.totalsRow },
              el(Text, { style: styles.totalsLabel }, t.subtotal),
              el(Text, { style: styles.totalsLabel }, money)
            ),
            el(
              View,
              { style: [styles.totalsRow, styles.totalsDivider] },
              el(Text, { style: styles.grandLabel }, t.total),
              el(Text, { style: styles.grandValue }, money)
            )
          )
        ),

        // Receipt half, only once the money actually moved.
        paid
          ? el(
              View,
              { style: styles.receipt },
              el(Text, { style: styles.receiptTitle }, t.receiptTitle),
              el(
                View,
                { style: styles.receiptGrid },
                el(
                  View,
                  { style: [styles.receiptCell, { flex: 1.3 }] },
                  el(Text, { style: styles.receiptKey }, t.method),
                  el(Text, { style: styles.receiptVal }, method)
                ),
                paidOn
                  ? el(
                      View,
                      { style: styles.receiptCell },
                      el(Text, { style: styles.receiptKey }, t.paidOn),
                      el(Text, { style: styles.receiptVal }, formatDate(paidOn, locale))
                    )
                  : null,
                receipt?.id
                  ? el(
                      View,
                      { style: [styles.receiptCell, { flex: 1.4 }] },
                      el(Text, { style: styles.receiptKey }, t.txn),
                      el(Text, { style: styles.receiptVal }, receipt.id)
                    )
                  : null
              )
            )
          : el(Text, { style: styles.notice }, t.dueNotice),

        // The loop, travelling with the document.
        el(
          View,
          { style: styles.referral },
          el(Text, { style: styles.referralTitle }, t.refTitle),
          el(Text, { style: styles.referralBody }, invoice.cta_message || t.refFallback),
          el(
            Text,
            { style: styles.referralLink },
            `${t.open}: ${origin}/invoice/${invoice.public_id}`
          )
        )
      ),

      el(
        View,
        { style: styles.footer, fixed: true },
        el(Text, { style: styles.footerText }, `${t.madeWith} · involoop.vercel.app`),
        el(Text, { style: styles.footerText }, t.testMode)
      )
    )
  );

  const buffer = await renderToBuffer(doc as never);
  const kind = paid ? "receipt" : "invoice";
  const filename = `${invoice.number}-${kind}-${invoice.client_name}`.replace(/[^a-zA-Z0-9-]+/g, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

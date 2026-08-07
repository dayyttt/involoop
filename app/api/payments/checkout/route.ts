import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  createOrder,
  approvalUrl,
  paypalConfigured,
  paypalSupportsCurrency,
} from "@/lib/paypal";
import { apiError } from "@/lib/api-lang";

// Create a PayPal order for a public invoice.
//
// The amount is read from the database and never from the request body: a
// client who edits the payload still pays what the invoice says. The order is
// addressed to the freelancer's own PayPal account when they have saved one, so
// Involoop is not in the money path.
// Expects: { public_id: string }
export async function POST(req: NextRequest) {
  let lang: unknown = "en";
  try {
    const body = await req.json();
    const { public_id } = body;
    lang = body.lang;
    if (!public_id) return NextResponse.json({ error: "public_id is required" }, { status: 400 });

    if (!paypalConfigured()) {
      return NextResponse.json(
        {
          error: apiError(
            lang,
            "PayPal is not enabled for this project yet.",
            "PayPal belum aktif untuk proyek ini."
          ),
        },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { data: invoice, error } = await admin
      .from("invoices")
      .select("id, public_id, number, client_name, description, amount_minor, currency, status, owner_id")
      .eq("public_id", public_id)
      .single();
    if (error || !invoice) {
      return NextResponse.json(
        { error: apiError(lang, "Invoice not found.", "Invoice tidak ditemukan.") },
        { status: 404 }
      );
    }
    if (invoice.status !== "unpaid" && invoice.status !== "payment_pending") {
      return NextResponse.json(
        { error: apiError(lang, "This invoice has already been processed.", "Invoice sudah diproses.") },
        { status: 409 }
      );
    }

    // PayPal does not settle in every currency Involoop can bill in — rupiah
    // above all. Saying so plainly is better than a failed redirect.
    if (!paypalSupportsCurrency(invoice.currency)) {
      return NextResponse.json(
        {
          error: apiError(
            lang,
            `PayPal cannot process ${invoice.currency}. Ask your client to use the bank transfer option below.`,
            `PayPal tidak memproses ${invoice.currency}. Minta klienmu memakai opsi transfer bank di bawah.`
          ),
        },
        { status: 409 }
      );
    }

    const { data: owner } = await admin
      .from("profiles")
      .select("paypal_email")
      .eq("id", invoice.owner_id)
      .single();

    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app";
    const amountMinor = Number(invoice.amount_minor);

    const order = await createOrder({
      amountMinor,
      currency: invoice.currency,
      referenceId: invoice.public_id,
      description: `${invoice.number} · ${invoice.client_name}`,
      invoiceNumber: invoice.number,
      returnUrl: `${base}/api/payments/capture?invoice=${invoice.public_id}`,
      cancelUrl: `${base}/invoice/${invoice.public_id}`,
      payeeEmail: owner?.paypal_email ?? null,
      // Deliberately no idempotency key. It used to pin every attempt for this
      // invoice to one PayPal order, which meant a declined card or an expired
      // order became permanent: reloading the page handed back the same dead
      // order forever. A fresh order per attempt costs nothing — only one of
      // them can ever be captured — and it is the difference between "try
      // another card" working and not.
    });

    const url = approvalUrl(order);
    if (!url) {
      console.error("paypal order without approval link", order?.id);
      return NextResponse.json(
        { error: apiError(lang, "Could not start the payment. Try again.", "Gagal memulai pembayaran. Coba lagi.") },
        { status: 502 }
      );
    }

    const { error: payErr } = await admin.from("payments").insert({
      invoice_id: invoice.id,
      provider: "paypal",
      provider_session_id: order.id,
      connected_account_id: owner?.paypal_email ?? null,
      amount_minor: amountMinor,
      platform_fee_minor: 0,
      net_amount_minor: amountMinor,
      currency: invoice.currency,
      status: "created",
    });
    if (payErr) {
      console.error("payment insert error", payErr.message);
    }

    await admin
      .from("invoices")
      .update({ status: "payment_pending" })
      .eq("id", invoice.id)
      .eq("status", "unpaid");

    // `id` drives the in-page buttons; `url` is the redirect fallback.
    return NextResponse.json({ id: order.id, url });
  } catch (err: any) {
    console.error("paypal checkout error", err?.message ?? err);
    return NextResponse.json(
      {
        error: apiError(
          lang,
          "Could not create the payment. Try again.",
          "Gagal membuat pembayaran. Coba lagi."
        ),
      },
      { status: 500 }
    );
  }
}

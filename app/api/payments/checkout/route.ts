import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { apiError } from "@/lib/api-lang";

// Create a Stripe Checkout Session for a public invoice. Funds settle to the
// OWNER's connected account (destination charge), never to Involoop's balance.
// The amount is always read from the database, never from the client.
// Expects: { public_id: string }
export async function POST(req: NextRequest) {
  let lang: unknown = "en";
  try {
    const body = await req.json();
    const { public_id } = body;
    lang = body.lang;
    if (!public_id) return NextResponse.json({ error: "public_id is required" }, { status: 400 });

    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: apiError(lang, "Card payment is not enabled for this project yet.", "Pembayaran Stripe belum aktif untuk proyek ini.") },
        { status: 503 }
      );
    }

    const admin = createAdminClient();
    const { data: invoice, error } = await admin
      .from("invoices")
      .select("id, public_id, number, client_name, amount_minor, currency, status, owner_id")
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

    const { data: owner } = await admin
      .from("profiles")
      .select("stripe_account_id, stripe_status")
      .eq("id", invoice.owner_id)
      .single();

    const stripe = getStripe()!;
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app";

    // Sandbox mode: charge the platform account unless the owner is connected
    // (Stripe Connect). Test-mode checkout works either way.
    const connected =
      owner?.stripe_account_id && owner.stripe_status === "connected"
        ? owner.stripe_account_id
        : null;

    // Application fee is computed server-side from configured basis points.
    const FEE_BPS = Number(process.env.STRIPE_APPLICATION_FEE_BASIS_POINTS || 0);
    const amountMinor = Number(invoice.amount_minor);
    const feeMinor = Math.floor((amountMinor * FEE_BPS) / 10000);
    const netMinor = amountMinor - feeMinor;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: { name: `${invoice.number} · ${invoice.client_name}` },
            unit_amount: amountMinor,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: connected
        ? {
            transfer_data: { destination: connected },
            application_fee_amount: feeMinor > 0 ? feeMinor : undefined,
          }
        : {},
      metadata: {
        invoice_id: invoice.id,
        public_id: invoice.public_id,
      },
      success_url: `${base}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/invoice/${invoice.public_id}`,
    });

    const { error: payErr } = await admin.from("payments").insert({
      invoice_id: invoice.id,
      provider: "stripe",
      provider_session_id: session.id,
      connected_account_id: connected,
      amount_minor: amountMinor,
      platform_fee_minor: feeMinor,
      net_amount_minor: netMinor,
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

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("checkout error", err);
    return NextResponse.json(
      { error: apiError(lang, "Could not create the payment session. Try again.", "Gagal membuat sesi pembayaran. Coba lagi.") },
      { status: 500 }
    );
  }
}

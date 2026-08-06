import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";

// Create a Stripe Checkout Session for a public invoice. Funds settle to the
// OWNER's connected account (destination charge), never to Involoop's balance.
// The amount is always read from the database, never from the client.
// Expects: { public_id: string }
export async function POST(req: NextRequest) {
  try {
    const { public_id } = await req.json();
    if (!public_id) return NextResponse.json({ error: "public_id is required" }, { status: 400 });

    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: "Pembayaran Stripe belum aktif untuk proyek ini." },
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
      return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
    }
    if (invoice.status !== "unpaid" && invoice.status !== "payment_pending") {
      return NextResponse.json(
        { error: "Invoice sudah diproses." },
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

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: { name: `${invoice.number} — ${invoice.client_name}` },
            unit_amount: Number(invoice.amount_minor),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: connected
        ? { transfer_data: { destination: connected } }
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
      amount_minor: Number(invoice.amount_minor),
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
      { error: "Gagal membuat sesi pembayaran. Coba lagi." },
      { status: 500 }
    );
  }
}

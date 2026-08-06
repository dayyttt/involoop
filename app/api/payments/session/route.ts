import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// Public read for the payment success page: returns the paid invoice after a
// Stripe redirect, keyed by the Checkout Session id that Stripe puts in the URL.
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select(
      "provider_session_id, provider_payment_id, status, paid_at, amount_minor, currency, invoice:invoices(public_id, number, client_name, amount, currency, status)"
    )
    .eq("provider_session_id", sessionId)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "Sesi pembayaran tidak ditemukan." }, { status: 404 });
  }

  const invoice = Array.isArray(payment.invoice) ? payment.invoice[0] : payment.invoice;

  return NextResponse.json({
    payment: {
      provider_session_id: payment.provider_session_id,
      provider_payment_id: payment.provider_payment_id,
      status: payment.status,
      paid_at: payment.paid_at,
      amount_minor: payment.amount_minor,
      currency: payment.currency,
    },
    invoice,
  });
}

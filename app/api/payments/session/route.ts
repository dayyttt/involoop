import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// Public read for the payment success page: returns the paid invoice after the
// PayPal redirect, keyed by the order id PayPal returns as `token`.
export async function GET(req: NextRequest) {
  const sessionId =
    req.nextUrl.searchParams.get("order") ?? req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "order is required" }, { status: 400 });
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
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  const invoice = Array.isArray(payment.invoice) ? payment.invoice[0] : payment.invoice;

  return NextResponse.json({
    // `status` here is the whole point: a payment row exists from the moment an
    // order is created, long before any money moves.
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

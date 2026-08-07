import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { captureOrder, fromPaypalAmount } from "@/lib/paypal";

export const dynamic = "force-dynamic";

// Where PayPal sends the payer after they approve. Stripe captures on its own
// side and only tells us over the webhook; PayPal expects the merchant to
// capture, so this is the step that actually takes the money.
//
// The webhook still exists and still marks the invoice paid. This route is not
// a substitute for it — it is the fast path so the client sees "paid" the
// instant they land, instead of waiting for a webhook that may take seconds.
// Both write the same rows, and both are safe to run twice.
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app";
  const orderId = req.nextUrl.searchParams.get("token");
  const publicId = req.nextUrl.searchParams.get("invoice");

  if (!orderId) {
    return NextResponse.redirect(`${base}/invoice/${publicId ?? ""}?payment=missing`);
  }

  const admin = createAdminClient();
  const planParam = req.nextUrl.searchParams.get("plan");

  try {
    const result = await captureOrder(orderId);
    const capture = result?.purchase_units?.[0]?.payments?.captures?.[0];
    const completed = result?.status === "COMPLETED" || capture?.status === "COMPLETED";

    // A plan purchase, not an invoice. The buyer travels in reference_id
    // because PayPal orders carry no metadata bag.
    const reference: string = result?.purchase_units?.[0]?.reference_id ?? "";
    if (planParam || reference.startsWith("plan_")) {
      const [, plan, userId] = reference.split("_");
      if (completed && userId && (plan === "starter" || plan === "pro")) {
        const expiresAt =
          plan === "pro" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null;
        await admin
          .from("profiles")
          .update({ plan, plan_expires_at: expiresAt, plan_session_id: null })
          .eq("id", userId);
        return NextResponse.redirect(`${base}/dashboard?upgraded=${plan}`);
      }
      return NextResponse.redirect(`${base}/#pricing`);
    }

    if (!completed) {
      await admin
        .from("payments")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("provider_session_id", orderId);
      return NextResponse.redirect(`${base}/payment/success?order=${orderId}`);
    }

    // PayPal's own fee, so the freelancer sees what actually landed rather than
    // the gross figure.
    const grossMinor = capture?.amount?.value ? fromPaypalAmount(capture.amount.value) : null;
    const feeMinor = capture?.seller_receivable_breakdown?.paypal_fee?.value
      ? fromPaypalAmount(capture.seller_receivable_breakdown.paypal_fee.value)
      : 0;
    const netMinor = capture?.seller_receivable_breakdown?.net_amount?.value
      ? fromPaypalAmount(capture.seller_receivable_breakdown.net_amount.value)
      : grossMinor;

    await admin
      .from("payments")
      .update({
        status: "succeeded",
        provider_payment_id: capture?.id ?? null,
        provider_charge_id: capture?.id ?? null,
        platform_fee_minor: feeMinor,
        ...(netMinor !== null ? { net_amount_minor: netMinor } : {}),
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("provider_session_id", orderId);

    const { data: payment } = await admin
      .from("payments")
      .select("invoice_id")
      .eq("provider_session_id", orderId)
      .maybeSingle();

    if (payment) {
      await admin
        .from("invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", payment.invoice_id)
        .in("status", ["unpaid", "payment_pending"]);
    }

    return NextResponse.redirect(`${base}/payment/success?order=${orderId}`);
  } catch (err: any) {
    // A refresh of this URL hits an order PayPal has already captured. That is
    // not a failure: the money moved, and the webhook has the same result.
    const issue = err?.message ?? "";
    if (issue.includes("ORDER_ALREADY_CAPTURED")) {
      return NextResponse.redirect(
        planParam ? `${base}/dashboard?upgraded=${planParam}` : `${base}/payment/success?order=${orderId}`
      );
    }
    if (planParam) {
      console.error("paypal plan capture error", issue);
      return NextResponse.redirect(`${base}/#pricing`);
    }
    console.error("paypal capture error", issue);
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("provider_session_id", orderId);
    return NextResponse.redirect(`${base}/invoice/${publicId ?? ""}?payment=failed`);
  }
}

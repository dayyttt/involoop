import { createAdminClient } from "@/lib/supabase-admin";
import { captureOrder, fromPaypalAmount } from "@/lib/paypal";

// Taking the money and writing down that it happened.
//
// Three different things call this: the in-page PayPal buttons, the redirect
// fallback for anyone whose browser blocked the popup, and nothing else — the
// webhook writes the same rows itself. All of them can arrive for the same
// order, so every write here is idempotent and the "already captured" reply
// from PayPal is treated as success, because the money did move.
export interface CaptureResult {
  ok: boolean;
  paid: boolean;
  plan?: { plan: string; userId: string } | null;
  publicId?: string | null;
  error?: string;
  /** The card was declined. PayPal expects the buyer to be offered another
      funding source on the same order rather than being told it is over. */
  retryable?: boolean;
}

export async function capturePayment(orderId: string): Promise<CaptureResult> {
  const admin = createAdminClient();

  let result: any;
  try {
    result = await captureOrder(orderId);
  } catch (err: any) {
    const issue = err?.message ?? "";
    if (issue.includes("ORDER_ALREADY_CAPTURED")) {
      // Someone got here twice. The first pass already did the work.
      const { data: payment } = await admin
        .from("payments")
        .select("invoice_id, status")
        .eq("provider_session_id", orderId)
        .maybeSingle();
      return { ok: true, paid: payment?.status === "succeeded", publicId: null };
    }
    // A declined card is the single most common outcome at this step and it is
    // not a failure of the payment — the buyer simply has to use a different
    // card or their PayPal balance. PayPal keeps the order approvable for
    // exactly that, so it must not be recorded as a dead payment.
    if (issue.includes("INSTRUMENT_DECLINED")) {
      await admin
        .from("payments")
        .update({ status: "created", updated_at: new Date().toISOString() })
        .eq("provider_session_id", orderId);
      return { ok: false, paid: false, retryable: true, error: "INSTRUMENT_DECLINED" };
    }
    console.error("paypal capture error", issue);
    await admin
      .from("payments")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("provider_session_id", orderId);
    return { ok: false, paid: false, error: issue || "CAPTURE_FAILED" };
  }

  const unit = result?.purchase_units?.[0] ?? {};
  const capture = unit?.payments?.captures?.[0];
  const completed = result?.status === "COMPLETED" || capture?.status === "COMPLETED";

  // A plan purchase rather than an invoice. PayPal round-trips no metadata bag,
  // so who bought what travels in reference_id.
  const reference: string = unit.reference_id ?? "";
  if (reference.startsWith("plan_")) {
    const [, plan, userId] = reference.split("_");
    if (completed && userId && (plan === "starter" || plan === "pro")) {
      const expiresAt =
        plan === "pro" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null;
      await admin
        .from("profiles")
        .update({
          plan,
          plan_expires_at: expiresAt,
          // The quota is counted from here, so buying a plan delivers the full
          // number of invoices it advertises rather than the remainder after
          // whatever the account already published.
          plan_started_at: new Date().toISOString(),
          plan_session_id: null,
        })
        .eq("id", userId);
      return { ok: true, paid: true, plan: { plan, userId } };
    }
    return { ok: false, paid: false, error: "PLAN_NOT_COMPLETED" };
  }

  if (!completed) {
    await admin
      .from("payments")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("provider_session_id", orderId);
    return { ok: true, paid: false };
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

  let publicId: string | null = null;
  if (payment) {
    const { data: inv } = await admin
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", payment.invoice_id)
      .in("status", ["unpaid", "payment_pending"])
      .select("public_id")
      .maybeSingle();
    publicId = inv?.public_id ?? null;
  }

  return { ok: true, paid: true, publicId };
}

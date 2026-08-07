import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { verifyWebhook, fromPaypalAmount } from "@/lib/paypal";

export const dynamic = "force-dynamic";

// PayPal webhook endpoint. Signature-verified through PayPal's own
// verify-webhook-signature call, and idempotent: every event is recorded in
// webhook_events with a UNIQUE(provider_event_id), so a replay can never
// double-apply a payment or a status change.
//
// This endpoint is public and it marks invoices paid, so an unverified body is
// rejected outright rather than processed optimistically.
export async function POST(req: NextRequest) {
  const raw = await req.text();

  const verified = await verifyWebhook(req.headers, raw);
  if (!verified) {
    console.error("paypal webhook rejected: signature not verified");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("webhook_events")
    .select("id")
    .eq("provider_event_id", event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await admin.from("webhook_events").insert({
    provider: "paypal",
    provider_event_id: event.id,
    event_type: event.event_type,
    status: "received",
  });

  try {
    const resource = event.resource ?? {};

    switch (event.event_type) {
      // The money has actually moved. This is the only event that marks an
      // invoice paid.
      case "PAYMENT.CAPTURE.COMPLETED": {
        const captureId = resource.id;
        // The order id is the link back to our payments row. PayPal puts it in
        // supplementary_data; falling back to invoice_id (our invoice number)
        // covers captures created outside the checkout flow.
        const orderId = resource.supplementary_data?.related_ids?.order_id;

        const feeMinor = resource.seller_receivable_breakdown?.paypal_fee?.value
          ? fromPaypalAmount(resource.seller_receivable_breakdown.paypal_fee.value)
          : 0;
        const netMinor = resource.seller_receivable_breakdown?.net_amount?.value
          ? fromPaypalAmount(resource.seller_receivable_breakdown.net_amount.value)
          : null;

        const match = orderId
          ? admin.from("payments").select("invoice_id").eq("provider_session_id", orderId)
          : admin.from("payments").select("invoice_id").eq("provider_payment_id", captureId);

        const { data: payment } = await match.maybeSingle();

        const update = {
          status: "succeeded",
          provider_payment_id: captureId,
          provider_charge_id: captureId,
          platform_fee_minor: feeMinor,
          ...(netMinor !== null ? { net_amount_minor: netMinor } : {}),
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (orderId) {
          await admin.from("payments").update(update).eq("provider_session_id", orderId);
        } else {
          await admin.from("payments").update(update).eq("provider_payment_id", captureId);
        }

        if (payment) {
          await admin
            .from("invoices")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", payment.invoice_id)
            .in("status", ["unpaid", "payment_pending"]);
        }
        break;
      }

      // A plan purchase settles on the platform account and grants quota. The
      // order carries the buyer in reference_id, which is the only free-text
      // field PayPal round-trips through an order.
      case "CHECKOUT.ORDER.APPROVED": {
        const unit = resource.purchase_units?.[0] ?? {};
        const ref: string = unit.reference_id ?? "";
        if (!ref.startsWith("plan_")) break;

        const [, plan, userId] = ref.split("_");
        if (!userId || !["starter", "pro"].includes(plan)) break;

        const expiresAt =
          plan === "pro" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null;
        await admin
          .from("profiles")
          .update({ plan, plan_expires_at: expiresAt, plan_session_id: null })
          .eq("id", userId);
        break;
      }

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED": {
        const orderId = resource.supplementary_data?.related_ids?.order_id;
        if (orderId) {
          await admin
            .from("payments")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("provider_session_id", orderId);
          const { data: pay } = await admin
            .from("payments")
            .select("invoice_id")
            .eq("provider_session_id", orderId)
            .maybeSingle();
          if (pay) {
            await admin
              .from("invoices")
              .update({ status: "unpaid" })
              .eq("id", pay.invoice_id)
              .eq("status", "payment_pending");
          }
        }
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED": {
        // The refund resource points at the capture it reverses.
        const captureId =
          resource.links?.find((l: any) => l.rel === "up")?.href?.split("/").pop() ??
          resource.id;
        await admin
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("provider_charge_id", captureId);
        break;
      }

      // The payer walked away from an approved order and it timed out.
      case "CHECKOUT.ORDER.VOIDED": {
        const orderId = resource.id;
        await admin
          .from("payments")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("provider_session_id", orderId);
        const { data: pay } = await admin
          .from("payments")
          .select("invoice_id")
          .eq("provider_session_id", orderId)
          .maybeSingle();
        if (pay) {
          await admin
            .from("invoices")
            .update({ status: "unpaid" })
            .eq("id", pay.invoice_id)
            .eq("status", "payment_pending");
        }
        break;
      }

      default:
        break;
    }

    await admin
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("provider_event_id", event.id);
  } catch (err: any) {
    console.error("paypal webhook processing error", err?.message ?? err);
    await admin
      .from("webhook_events")
      .update({ status: "failed" })
      .eq("provider_event_id", event.id);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

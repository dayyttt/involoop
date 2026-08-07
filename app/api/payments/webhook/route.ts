import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { verifyWebhook, fromPaypalAmount, getCapture, getOrder } from "@/lib/paypal";

export const dynamic = "force-dynamic";

// PayPal webhook endpoint. Public, and it marks invoices paid, so it is written
// on the assumption that the body is a lie until PayPal itself says otherwise.
//
// The signature check runs first and an unverified body is rejected outright.
// But that check alone is not enough: PayPal's SANDBOX verify-webhook-signature
// answers SUCCESS for any signature, including the literal string
// "tanda-tangan-palsu". Confirmed by sending exactly that. A forged POST with
// the five expected headers therefore passes verification in sandbox.
//
// So a verified event is treated as nothing more than a nudge saying "something
// may have happened to this id". Every state change below is decided by a fresh
// authenticated read from PayPal — the capture must exist, be COMPLETED, and
// match the amount and currency we recorded when the order was created. A
// fabricated event names an id PayPal has never issued, and dies at that read.
//
// Idempotency is unchanged: webhook_events has UNIQUE(provider_event_id), so a
// genuine replay is a no-op.
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
        if (!captureId) break;

        // The authoritative read. Everything below trusts this, not the body.
        const capture = await getCapture(captureId);
        if (!capture || capture.status !== "COMPLETED") {
          console.error("webhook claimed a capture PayPal does not confirm", captureId);
          break;
        }

        const orderId =
          capture.supplementary_data?.related_ids?.order_id ??
          resource.supplementary_data?.related_ids?.order_id;

        const { data: payment } = await admin
          .from("payments")
          .select("id, invoice_id, amount_minor, currency")
          .eq(orderId ? "provider_session_id" : "provider_payment_id", orderId ?? captureId)
          .maybeSingle();

        if (!payment) {
          console.error("capture confirmed by PayPal but unknown here", captureId);
          break;
        }

        // A capture for the right id but the wrong money is not our payment.
        const paidMinor = capture.amount?.value ? fromPaypalAmount(capture.amount.value) : null;
        const paidCurrency = capture.amount?.currency_code;
        if (paidMinor !== Number(payment.amount_minor) || paidCurrency !== payment.currency) {
          console.error(
            "capture amount does not match the invoice",
            captureId,
            paidMinor,
            paidCurrency
          );
          break;
        }

        const feeMinor = capture.seller_receivable_breakdown?.paypal_fee?.value
          ? fromPaypalAmount(capture.seller_receivable_breakdown.paypal_fee.value)
          : 0;
        const netMinor = capture.seller_receivable_breakdown?.net_amount?.value
          ? fromPaypalAmount(capture.seller_receivable_breakdown.net_amount.value)
          : null;

        await admin
          .from("payments")
          .update({
            status: "succeeded",
            provider_payment_id: captureId,
            provider_charge_id: captureId,
            platform_fee_minor: feeMinor,
            ...(netMinor !== null ? { net_amount_minor: netMinor } : {}),
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        await admin
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", payment.invoice_id)
          .in("status", ["unpaid", "payment_pending"]);
        break;
      }

      // A plan purchase settles on the platform account and grants quota. The
      // order carries the buyer in reference_id, which is the only free-text
      // field PayPal round-trips through an order.
      case "CHECKOUT.ORDER.APPROVED": {
        const orderId = resource.id;
        if (!orderId) break;

        // Same rule: read the order from PayPal rather than believing the body,
        // otherwise a forged event grants anyone a paid plan for free.
        let order: any;
        try {
          order = await getOrder(orderId);
        } catch {
          console.error("webhook claimed an order PayPal does not know", orderId);
          break;
        }
        if (!order || !["APPROVED", "COMPLETED"].includes(order.status)) break;

        const ref: string = order.purchase_units?.[0]?.reference_id ?? "";
        if (!ref.startsWith("plan_")) break;

        const [, plan, userId] = ref.split("_");
        if (!userId || !["starter", "pro"].includes(plan)) break;

        // The order must be the one this account actually started.
        const { data: buyer } = await admin
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .eq("plan_session_id", orderId)
          .maybeSingle();
        if (!buyer) {
          console.error("plan order does not belong to the claimed account", orderId);
          break;
        }

        const expiresAt =
          plan === "pro" ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null;
        await admin
          .from("profiles")
          .update({
            plan,
            plan_expires_at: expiresAt,
            plan_started_at: new Date().toISOString(),
            plan_session_id: null,
          })
          .eq("id", userId);
        break;
      }

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED": {
        const deniedCapture = resource.id ? await getCapture(resource.id) : null;
        if (!deniedCapture || deniedCapture.status !== "DECLINED") break;
        const orderId = deniedCapture.supplementary_data?.related_ids?.order_id;
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
        if (!captureId) break;
        const capture = await getCapture(captureId);
        if (!capture || !["REFUNDED", "PARTIALLY_REFUNDED"].includes(capture.status)) {
          console.error("refund claimed but PayPal does not confirm it", captureId);
          break;
        }
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
        if (!orderId) break;
        let voided: any = null;
        try {
          voided = await getOrder(orderId);
        } catch {
          break;
        }
        if (!voided || voided.status !== "VOIDED") break;
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

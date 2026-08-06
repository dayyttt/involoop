import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Stripe webhook endpoint. Signature-verified, idempotent: every event is
// recorded in webhook_events with a UNIQUE(provider_event_id), so a replayed
// webhook can never double-apply a payment or a status change.
export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature ?? "", secret);
  } catch (err: any) {
    console.error("webhook signature error", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: skip if this exact event was already processed.
  const { data: existing } = await admin
    .from("webhook_events")
    .select("id")
    .eq("provider_event_id", event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await admin.from("webhook_events").insert({
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    status: "received",
  });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

        const { data: payment } = await admin
          .from("payments")
          .select("invoice_id, provider_session_id")
          .eq("provider_session_id", session.id)
          .maybeSingle();

        await admin
          .from("payments")
          .update({
            status: "succeeded",
            paid_at: new Date().toISOString(),
            ...(paymentIntentId ? { provider_payment_id: paymentIntentId } : {}),
          })
          .eq("provider_session_id", session.id);

        if (payment) {
          await admin
            .from("invoices")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("id", payment.invoice_id)
            .in("status", ["unpaid", "payment_pending"]);
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as any;
        // Capture the real charge + fee server-side so local records match Stripe.
        let chargeFields: Record<string, unknown> = {
          status: "succeeded",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        try {
          const fullPi = await stripe.paymentIntents.retrieve(pi.id, {
            expand: ["latest_charge"],
          });
          const ch = fullPi.latest_charge;
          if (typeof ch !== "string" && ch?.id) {
            const fee = Number(ch.application_fee_amount ?? 0);
            chargeFields = {
              ...chargeFields,
              provider_charge_id: ch.id,
              platform_fee_minor: fee,
              net_amount_minor: Number(ch.amount) - fee,
            };
          }
        } catch (err: any) {
          console.error("charge capture failed", err.message);
        }
        await admin
          .from("payments")
          .update(chargeFields)
          .eq("provider_payment_id", pi.id);
        break;
      }
      case "charge.succeeded": {
        const charge = event.data.object as any;
        const piId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        const fee = Number(charge.application_fee_amount ?? 0);
        await admin
          .from("payments")
          .update({
            provider_charge_id: charge.id,
            platform_fee_minor: fee,
            net_amount_minor: Number(charge.amount) - fee,
            status: "succeeded",
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("provider_payment_id", piId);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as any;
        await admin
          .from("payments")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("provider_session_id", session.id);
        const { data: pay } = await admin
          .from("payments")
          .select("invoice_id")
          .eq("provider_session_id", session.id)
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
      case "payment_intent.payment_failed": {
        const pi = event.data.object as any;
        await admin
          .from("payments")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("provider_payment_id", pi.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as any;
        const piId =
          typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        await admin
          .from("payments")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .or(`provider_payment_id.eq.${piId},provider_charge_id.eq.${charge.id}`);
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
    console.error("webhook processing error", err);
    await admin
      .from("webhook_events")
      .update({ status: "failed" })
      .eq("provider_event_id", event.id);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

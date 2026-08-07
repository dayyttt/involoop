import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createOrder, approvalUrl, paypalConfigured } from "@/lib/paypal";
import { apiError } from "@/lib/api-lang";

// Buy a paid plan. This one order goes to the Involoop platform account rather
// than to a freelancer, because it is Involoop being paid.
//
// Both plans are one-time orders. PayPal's recurring billing lives in a
// separate Subscriptions API with its own product and plan objects; Pro already
// worked as a 30-day grant that the webhook does not auto-extend, so moving it
// to a one-time order changes nothing a user would notice.
// Expects: { plan: "starter" | "pro", lang?: "en" | "id" }
const PLANS: Record<string, { name: string; amountMinor: number }> = {
  starter: { name: "Involoop Starter", amountMinor: 300 },
  pro: { name: "Involoop Pro · 30 days", amountMinor: 800 },
};

export async function POST(req: NextRequest) {
  const { plan, lang } = await req.json().catch(() => ({}));
  try {
    if (!paypalConfigured()) {
      return NextResponse.json(
        { error: apiError(lang, "PayPal is not configured.", "PayPal belum dikonfigurasi.") },
        { status: 503 }
      );
    }
    const cfg = PLANS[String(plan)];
    if (!cfg) {
      return NextResponse.json(
        { error: apiError(lang, "Unknown plan.", "Paket tidak dikenal.") },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: apiError(lang, "You are not signed in.", "Kamu belum login.") },
        { status: 401 }
      );
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app";

    // PayPal has no metadata bag, so who bought what travels in reference_id.
    // The webhook and the capture route both read it back from there.
    const order = await createOrder({
      amountMinor: cfg.amountMinor,
      currency: "USD",
      referenceId: `plan_${plan}_${user.id}`,
      description: cfg.name,
      invoiceNumber: `PLAN-${String(plan).toUpperCase()}`,
      returnUrl: `${base}/api/payments/capture?plan=${plan}`,
      cancelUrl: `${base}/#pricing`,
      payeeEmail: null,
      idempotencyKey: `plan_${plan}_${user.id}`,
    });

    const url = approvalUrl(order);
    if (!url) {
      console.error("paypal plan order without approval link", order?.id);
      return NextResponse.json(
        { error: apiError(lang, "Could not start checkout. Try again.", "Gagal memulai pembayaran. Coba lagi.") },
        { status: 502 }
      );
    }

    await createAdminClient()
      .from("profiles")
      .update({ plan_session_id: order.id })
      .eq("id", user.id);

    return NextResponse.json({ url });
  } catch (err: any) {
    console.error("upgrade error", err?.message ?? err);
    return NextResponse.json(
      { error: apiError(lang, "Could not start checkout. Try again.", "Gagal memulai pembayaran. Coba lagi.") },
      { status: 500 }
    );
  }
}

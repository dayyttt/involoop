import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { apiError } from "@/lib/api-lang";

// Buy a paid plan. Funds go to the Involoop platform account (not a connected
// freelancer account), so this works in Stripe test mode.
// Starter: one-time $3, 10 invoices. Pro: $8/month, 50 invoices.
// Expects: { plan: "starter" | "pro", lang?: "en" | "id" }
const PLANS: Record<string, { name: string; unit_amount: number; recurring: boolean }> = {
  starter: { name: "Involoop Starter", unit_amount: 300, recurring: false },
  pro: { name: "Involoop Pro", unit_amount: 800, recurring: true },
};

export async function POST(req: NextRequest) {
  const { plan, lang } = await req.json().catch(() => ({}));
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: apiError(lang, "Stripe is not configured.", "Stripe belum dikonfigurasi.") },
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

    const stripe = getStripe()!;
    const base = process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: cfg.recurring ? "subscription" : "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: cfg.name },
            unit_amount: cfg.unit_amount,
            ...(cfg.recurring ? { recurring: { interval: "month" } } : {}),
          },
          quantity: 1,
        },
      ],
      metadata: {
        purpose: "plan_upgrade",
        plan: String(plan),
        user_id: user.id,
      },
      subscription_data: cfg.recurring
        ? { metadata: { purpose: "plan_upgrade", plan: String(plan), user_id: user.id } }
        : undefined,
      success_url: `${base}/dashboard?upgraded=${plan}`,
      cancel_url: `${base}/#pricing`,
    });

    await createAdminClient()
      .from("profiles")
      .update({ plan_session_id: session.id })
      .eq("id", user.id);

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("upgrade error", err);
    return NextResponse.json(
      { error: apiError(lang, "Could not start checkout. Try again.", "Gagal memulai pembayaran. Coba lagi.") },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { apiError } from "@/lib/api-lang";

// Connect a Stripe account (test mode) to the signed-in owner. The account is
// created as a Custom account pre-enabled with a test bank + capabilities, so
// the demo never needs a real onboarding interview.
export async function POST(req: NextRequest) {
  const { lang } = await req.json().catch(() => ({}));
  try {
    if (!stripeConfigured()) {
      return NextResponse.json(
        { error: apiError(lang, "Stripe is not configured. Add STRIPE_SECRET_KEY.", "Stripe belum dikonfigurasi. Tambahkan STRIPE_SECRET_KEY.") },
        { status: 503 }
      );
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json(
        { error: apiError(lang, "You are not signed in.", "Kamu belum login.") },
        { status: 401 }
      );

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("email, full_name, stripe_account_id, stripe_status")
      .eq("id", user.id)
      .single();

    const stripe = getStripe()!;

    let accountId = profile?.stripe_account_id ?? null;
    let chargesEnabled = false;
    if (accountId) {
      try {
        const existing = await stripe.accounts.retrieve(accountId);
        chargesEnabled = !!existing.charges_enabled;
      } catch {
        accountId = null;
      }
    }
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "custom",
        email: user.email ?? undefined,
        business_type: "individual",
        individual: {
          first_name: profile?.full_name?.split(" ")[0] || "Demo",
          last_name: profile?.full_name?.split(" ").slice(1).join(" ") || "Owner",
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: "0.0.0.0",
          user_agent: "Involoop demo",
        },
        business_profile: {
          mcc: "7311",
          url: process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app",
        },
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        external_account: {
          object: "bank_account",
          country: "US",
          currency: "usd",
          routing_number: "110000000",
          account_number: "000123456789",
        },
      });
      accountId = account.id;
      chargesEnabled = !!account.charges_enabled;

      await admin
        .from("profiles")
        .update({ stripe_account_id: account.id, stripe_status: "connected" })
        .eq("id", user.id);
    }

    // Only claim "connected" when the account can actually charge; otherwise
    // mark pending so checkout stays honest instead of failing mid-payment.
    const status = chargesEnabled ? "connected" : "pending";
    if (status !== "connected") {
      await admin
        .from("profiles")
        .update({ stripe_status: status })
        .eq("id", user.id);
    }

    return NextResponse.json({
      connected: status === "connected",
      status,
    });
  } catch (err: any) {
    console.error("stripe connect error", err);
    return NextResponse.json(
      { error: apiError(lang, "Could not connect Stripe. Try again.", "Gagal menghubungkan Stripe. Coba lagi.") },
      { status: 500 }
    );
  }
}

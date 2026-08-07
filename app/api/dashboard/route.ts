import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Single dashboard source: profile, invoices, credit ledger, referrals, and
// derived distribution stats. Session-protected, service-role reads so joined
// profiles (names of referred users) are visible to the owner. All data comes
// back in ONE database round trip via dashboard_payload().
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: payload, error } = await admin.rpc("dashboard_payload", {
    p_user_id: user.id,
  });

  // Fallback before migration-p1 runs: legacy multi-query path.
  if (error || !payload) {
    const [profileRes, invoicesRes, ledgerRes, referralsRes] = await Promise.all([
      admin
        .from("profiles")
        .select("email, full_name, free_invoice_credits, referral_code, stripe_account_id, stripe_status, plan, plan_expires_at")
        .eq("id", user.id)
        .single(),
      admin
        .from("invoices")
        .select("public_id, number, client_name, amount, currency, status, views, referral_clicks, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      admin
        .from("credit_ledger")
        .select("amount, type, reference, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("referrals")
        .select("id, created_at, reward_credits, referred:profiles!referrals_referred_id_fkey(full_name, email)")
        .eq("referrer_id", user.id)
        .eq("status", "rewarded")
        .order("created_at", { ascending: false }),
    ]);

    if (profileRes.error || invoicesRes.error || ledgerRes.error || referralsRes.error) {
      console.error(
        "dashboard load error",
        profileRes.error?.message,
        invoicesRes.error?.message,
        ledgerRes.error?.message,
        referralsRes.error?.message
      );
      return NextResponse.json(
        { error: "Gagal memuat dashboard." },
        { status: 500 }
      );
    }

    const fallbackPayload = {
      profile: profileRes.data,
      invoices: invoicesRes.data ?? [],
      ledger: ledgerRes.data ?? [],
      referrals: referralsRes.data ?? [],
    };
    const { profile, invoices, ledger, referrals } = fallbackPayload;

    const fbStats = buildStats(invoices, ledger, referrals);
    return NextResponse.json({
      profile,
      invoices,
      ledger,
      referrals,
      stats: fbStats,
    });
  }

  const profile = payload.profile;
  const invoices = payload.invoices ?? [];
  const ledger = payload.ledger ?? [];
  const referrals = payload.referrals ?? [];

  const stats = buildStats(invoices, ledger, referrals);

  return NextResponse.json({ profile, invoices, ledger, referrals, stats });
}

function buildStats(invoices: any[], ledger: any[], referrals: any[]) {
  const totalViews = invoices.reduce((sum: number, inv: any) => sum + (inv.views ?? 0), 0);
  const totalClicks = invoices.reduce((sum: number, inv: any) => sum + (inv.referral_clicks ?? 0), 0);
  const signups = referrals.length;
  const creditsEarned = ledger
    .filter((l: any) => l.amount > 0)
    .reduce((sum: number, l: any) => sum + l.amount, 0);

  return {
    total: invoices.length,
    paid: invoices.filter((i: any) => i.status === "paid").length,
    unpaid: invoices.filter((i: any) => i.status === "unpaid").length,
    awaiting: invoices.filter((i: any) => i.status === "awaiting_verification").length,
    total_views: totalViews,
    total_clicks: totalClicks,
    signups,
    conversion: totalViews > 0 ? Math.round((signups / totalViews) * 100) : 0,
    credits_earned: creditsEarned,
  };
}

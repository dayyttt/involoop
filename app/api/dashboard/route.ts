import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Single dashboard source: profile, invoices, credit ledger, referrals, and
// derived distribution stats. Session-protected, service-role reads so joined
// profiles (names of referred users) are visible to the owner.
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
  const uid = user.id;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, free_invoice_credits, referral_code, stripe_account_id, stripe_status")
    .eq("id", uid)
    .single();

  const { data: invoices } = await admin
    .from("invoices")
    .select("public_id, number, client_name, amount, currency, status, views, created_at")
    .eq("owner_id", uid)
    .order("created_at", { ascending: false });

  const { data: ledger } = await admin
    .from("credit_ledger")
    .select("amount, type, reference, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: referrals } = await admin
    .from("referrals")
    .select("id, created_at, reward_credits, referred:profiles(full_name, email)")
    .eq("referrer_id", uid)
    .eq("status", "rewarded")
    .order("created_at", { ascending: false });

  const list = invoices ?? [];
  const totalViews = list.reduce((sum, inv) => sum + (inv.views ?? 0), 0);
  const signups = (referrals ?? []).length;

  const stats = {
    total: list.length,
    paid: list.filter((i) => i.status === "paid").length,
    unpaid: list.filter((i) => i.status === "unpaid").length,
    awaiting: list.filter((i) => i.status === "awaiting_verification").length,
    total_views: totalViews,
    signups,
    conversion: totalViews > 0 ? Math.round((signups / totalViews) * 100) : 0,
  };

  return NextResponse.json({ profile, invoices: list, ledger: ledger ?? [], referrals: referrals ?? [], stats });
}

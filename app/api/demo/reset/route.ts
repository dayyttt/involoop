import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Demo-only reset: wipes the signed-in user's invoices, payments, referrals,
// and credit ledger, then restores a clean 3-credit balance. Guarded to demo
// accounts so production data can never be touched.
const DEMO_EMAILS = ["demo-owner@involoop.app", "demo-client@involoop.app"];

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (!profile || !DEMO_EMAILS.includes(profile.email.toLowerCase())) {
      return NextResponse.json(
        { error: "Reset hanya tersedia untuk akun demo." },
        { status: 403 }
      );
    }

    const { data: invoices } = await admin
      .from("invoices")
      .select("id")
      .eq("owner_id", user.id);

    const ids = (invoices ?? []).map((i) => i.id);
    if (ids.length) {
      await admin.from("payments").delete().in("invoice_id", ids);
      await admin.from("referrals").delete().eq("referrer_id", user.id);
      await admin.from("credit_ledger").delete().eq("user_id", user.id);
      await admin.from("invoices").delete().in("id", ids);
    } else {
      await admin.from("credit_ledger").delete().eq("user_id", user.id);
    }

    await admin
      .from("profiles")
      .update({
        free_invoice_credits: 3,
        paypal_email: null,
      })
      .eq("id", user.id);

    return NextResponse.json({ ok: true, credits: 3 });
  } catch (err: any) {
    console.error("reset error", err);
    return NextResponse.json({ error: "Gagal reset." }, { status: 500 });
  }
}

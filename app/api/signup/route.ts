import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Expects: { email: string, password: string, full_name: string,
//            ref_invoice_public_id?: string }
// ref_invoice_public_id is present when the user signed up via the CTA on
// someone else's invoice page — this is what wires the loop end to end.
export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, ref_invoice_public_id } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Gagal mendaftar" },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    let referrerId: string | null = null;
    let sourceInvoiceId: string | null = null;

    if (ref_invoice_public_id) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, owner_id")
        .eq("public_id", ref_invoice_public_id)
        .single();

      if (invoice) {
        referrerId = invoice.owner_id;
        sourceInvoiceId = invoice.id;
      }
    }

    // Note: no referral-fraud guard here. A farmer could create burner accounts
    // with different emails to farm credits. Real mitigation (reward only when
    // the referee creates/pays an invoice) is out of hackathon scope — the demo
    // brief only requires the loop to work end to end.

    // Both sides of the loop get rewarded: the referrer earns REWARD_CREDITS,
    // and the referee who arrives via a referral link starts with extra credits.
    const DEFAULT_CREDITS = 3;
    const REFEREE_BONUS = 2;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: newUserId,
      email,
      full_name: full_name ?? null,
      referred_by: referrerId,
      free_invoice_credits: DEFAULT_CREDITS + (referrerId ? REFEREE_BONUS : 0),
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // This is the loop closing: credit the referrer with bonus invoice
    // credits and log a referrals row judges can point at in the demo.
    if (referrerId) {
      const REWARD_CREDITS = 3;

      await supabase.from("referrals").insert({
        referrer_id: referrerId,
        referred_id: newUserId,
        source_invoice_id: sourceInvoiceId,
        status: "rewarded",
        reward_credits: REWARD_CREDITS,
        converted_at: new Date().toISOString(),
      });

      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("free_invoice_credits")
        .eq("id", referrerId)
        .single();

      if (referrerProfile) {
        await supabase
          .from("profiles")
          .update({
            free_invoice_credits: referrerProfile.free_invoice_credits + REWARD_CREDITS,
          })
          .eq("id", referrerId);
      }
    }

    return NextResponse.json({ user_id: newUserId, rewarded_referrer: !!referrerId });
  } catch (err: any) {
    console.error("signup error", err);
    return NextResponse.json({ error: "Gagal mendaftar. Coba lagi." }, { status: 500 });
  }
}

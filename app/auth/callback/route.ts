import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// OAuth callback (PKCE). Exchanges the code, then ensures the user has a
// profile + initial credits. If the visitor came from a referral CTA, the
// ref_invoice cookie restores attribution so the loop still rewards the owner.
export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${base}/login?error=oauth_failed`);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("oauth exchange error", error.message);
    return NextResponse.redirect(`${base}/login?error=oauth_failed`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      const ref = req.cookies.get("ref_invoice")?.value ?? null;
      await admin.rpc("finalize_signup", {
        p_user_id: user.id,
        p_email: user.email ?? "",
        p_full_name:
          (user.user_metadata?.full_name as string) ??
          (user.user_metadata?.name as string) ??
          null,
        p_ref_invoice_public_id: ref,
      });
      const res = NextResponse.redirect(`${base}${next}`);
      res.cookies.set("ref_invoice", "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  return NextResponse.redirect(`${base}${next}`);
}

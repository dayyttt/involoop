import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// OAuth callback (PKCE). Exchanges the code, then ensures the user has a
// profile + initial credits. If the visitor came from a referral CTA, the
// ref_invoice cookie restores attribution so the loop still rewards the owner.
// Only ever a path on this site. Anything else — an absolute URL, or the
// protocol-relative "//host" form — is discarded rather than redirected to.
function safeNext(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const decoded = decodeURIComponent(value);
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
  return decoded;
}

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const code = req.nextUrl.searchParams.get("code");
  // Where the person was actually heading before they were asked to sign in.
  // Carried in a cookie because Supabase validates redirectTo against its
  // allow list, so a query string on that URL is not safe to rely on.
  const wanted = req.cookies.get("oauth_next")?.value;

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
      // A brand new account came here to send an invoice, not to read a
      // dashboard of zeroes — the same landing the email signup path picks.
      const res = NextResponse.redirect(`${base}${safeNext(wanted, "/dashboard/new-invoice")}`);
      res.cookies.set("ref_invoice", "", { path: "/", maxAge: 0 });
      res.cookies.set("oauth_next", "", { path: "/", maxAge: 0 });
      return res;
    }
  }

  const res = NextResponse.redirect(`${base}${safeNext(wanted, "/dashboard")}`);
  res.cookies.set("oauth_next", "", { path: "/", maxAge: 0 });
  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { clientIp, rateLimited } from "@/lib/rate-limit";

// Track a referral CTA click on a public invoice (cookie-guarded per visitor).
// Feeds the dashboard "Referral clicks" distribution metric.
//
// The cookie dedupes honest visitors and nothing else — a caller that keeps no
// cookies counts every time. No credit is minted here, so the cost of forging
// it is a wrong number on someone's dashboard rather than money; the throttle
// is priced accordingly.
export async function POST(req: NextRequest) {
  try {
    const { public_id } = await req.json();
    if (!public_id || typeof public_id !== "string") {
      return NextResponse.json({ error: "public_id is required" }, { status: 400 });
    }

    if (rateLimited("refclick", clientIp(req), { windowMs: 60_000, max: 30 })) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const cookieName = `refclick_${public_id}`;
    const already = req.cookies.get(cookieName)?.value === "1";
    if (already) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    const admin = createAdminClient();
    const { data: clicks, error } = await admin.rpc("bump_referral_clicks", {
      p_public_id: public_id,
    });
    if (error) {
      console.error("click bump error", error.message);
      return NextResponse.json({ error: "Gagal mencatat klik." }, { status: 500 });
    }

    const res = NextResponse.json({ ok: true, clicks: clicks ?? 0 });
    res.cookies.set(cookieName, "1", {
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
    return res;
  } catch (err: any) {
    console.error("click route error", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}

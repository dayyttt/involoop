import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { clientIp, rateLimited } from "@/lib/rate-limit";

// View counter lives on POST so the CDN never caches it. The client fires this
// once per browser (localStorage guard) — see app/invoice/[id]/page.tsx.
//
// That guard is localStorage, which means it is advice. Anything that skips the
// browser can inflate a freelancer's view count as fast as it can post, and the
// number is shown to them as evidence their invoice is being read. A throttle
// does not make the metric trustworthy, but it stops it being free to forge.
export async function POST(req: NextRequest) {
  try {
    const { public_id } = await req.json();
    if (!public_id || typeof public_id !== "string") {
      return NextResponse.json({ error: "public_id is required" }, { status: 400 });
    }

    if (rateLimited("view", clientIp(req), { windowMs: 60_000, max: 30 })) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const admin = createAdminClient();
    const { data: views, error } = await admin.rpc("bump_views", { p_public_id: public_id });

    if (error) {
      console.error("view bump error", error.message);
      return NextResponse.json({ error: "Gagal mencatat kunjungan." }, { status: 500 });
    }

    return NextResponse.json({ views: views ?? 0 });
  } catch (err: any) {
    console.error("view route error", err);
    return NextResponse.json({ error: "Terjadi kesalahan." }, { status: 500 });
  }
}

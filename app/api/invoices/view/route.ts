import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// View counter lives on POST so the CDN never caches it. The client fires this
// once per browser (localStorage guard) — see app/invoice/[id]/page.tsx.
export async function POST(req: NextRequest) {
  try {
    const { public_id } = await req.json();
    if (!public_id || typeof public_id !== "string") {
      return NextResponse.json({ error: "public_id is required" }, { status: 400 });
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

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// One-click access to the live public invoice artifact, no login required.
// Resolves to the demo owner's most recent invoice so the link never goes stale.
export async function GET() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://involoop.vercel.app";
  const admin = createAdminClient();

  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .eq("email", "demo-owner@involoop.app")
    .maybeSingle();
  if (!owner) return NextResponse.redirect(base);

  const { data: invoice } = await admin
    .from("invoices")
    .select("public_id")
    .eq("owner_id", owner.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!invoice) return NextResponse.redirect(base);

  return NextResponse.redirect(`${base}/invoice/${invoice.public_id}`);
}

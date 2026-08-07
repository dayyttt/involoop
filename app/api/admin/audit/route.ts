import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireAdmin, adminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { actor, response } = await requireAdmin();
  if (!actor) return response;

  const { data, error } = await createAdminClient().rpc("admin_audit_log", {
    p_actor: actor.id,
    p_limit: 100,
  });
  if (error) {
    console.error("admin_audit_log", error.message);
    const mapped = adminError(error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  return NextResponse.json({ rows: data ?? [] });
}

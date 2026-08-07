import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireAdmin, adminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

const FILTERS = new Set(["all", "paid", "free", "suspended", "admin"]);

export async function GET(req: NextRequest) {
  const { actor, response } = await requireAdmin();
  if (!actor) return response;

  const params = req.nextUrl.searchParams;
  const filter = params.get("filter") ?? "all";
  // Paging is clamped here as well as in the database, so a crafted URL cannot
  // ask for the entire table in one response.
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 25) || 25, 1), 100);
  const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);

  const { data, error } = await createAdminClient().rpc("admin_users", {
    p_actor: actor.id,
    p_search: params.get("search"),
    p_filter: FILTERS.has(filter) ? filter : "all",
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    console.error("admin_users", error.message);
    const mapped = adminError(error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  return NextResponse.json(data);
}

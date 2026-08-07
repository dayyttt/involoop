import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireAdmin, adminError } from "@/lib/admin";

export const dynamic = "force-dynamic";

// One user: read them, and act on them.
//
// The actions live behind a single PATCH with a named `action` rather than four
// separate endpoints, so there is exactly one place where an admin write can
// enter the system and exactly one guard in front of it.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { actor, response } = await requireAdmin();
  if (!actor) return response;

  const { data, error } = await createAdminClient().rpc("admin_user_detail", {
    p_actor: actor.id,
    p_user: params.id,
  });
  if (error) {
    console.error("admin_user_detail", error.message);
    const mapped = adminError(error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { actor, response } = await requireAdmin();
  if (!actor) return response;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");
  const admin = createAdminClient();

  // Every branch passes the actor from the session, never from the body. The
  // database re-checks it anyway; both layers agree that the caller does not
  // get to say who they are.
  let call: { fn: string; args: Record<string, unknown> };

  switch (action) {
    case "suspend":
      call = {
        fn: "admin_set_suspended",
        args: {
          p_actor: actor.id,
          p_user: params.id,
          p_suspended: body.suspended !== false,
          p_reason: typeof body.reason === "string" ? body.reason.slice(0, 300) : null,
        },
      };
      break;
    case "role":
      call = {
        fn: "admin_set_role",
        args: { p_actor: actor.id, p_user: params.id, p_role: String(body.role ?? "") },
      };
      break;
    case "credits":
      call = {
        fn: "admin_adjust_credits",
        args: {
          p_actor: actor.id,
          p_user: params.id,
          p_delta: Math.trunc(Number(body.delta)) || 0,
          p_reason: typeof body.reason === "string" ? body.reason.slice(0, 300) : "",
        },
      };
      break;
    case "plan":
      call = {
        fn: "admin_set_plan",
        args: {
          p_actor: actor.id,
          p_user: params.id,
          p_plan: String(body.plan ?? ""),
          p_days: Math.trunc(Number(body.days)) || 30,
          p_reason: typeof body.reason === "string" ? body.reason.slice(0, 300) : null,
        },
      };
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data, error } = await admin.rpc(call.fn, call.args);
  if (error) {
    console.error(`admin action ${action}`, error.message);
    const mapped = adminError(error.message);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  return NextResponse.json(data ?? { ok: true });
}

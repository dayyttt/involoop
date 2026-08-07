import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

// Who is allowed into the operator console.
//
// The database already refuses non-admins inside every admin_* function, so
// this is the second lock rather than the only one. It exists so an unauthorised
// request is answered with 403 and never reaches a query, and so the console's
// own pages can be gated before they render anything.
//
// Two rules that are easy to get wrong and expensive to get wrong:
//   - the caller's identity comes from the session cookie, never from the body
//     or a header, so nobody can name themselves;
//   - the role is read from the database on every request, so revoking an admin
//     takes effect immediately rather than whenever their session expires.
export interface AdminActor {
  id: string;
  email: string;
}

type Guard = { actor: AdminActor; response: null } | { actor: null; response: NextResponse };

export async function requireAdmin(): Promise<Guard> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }

  const { data: profile } = await createAdminClient()
    .from("profiles")
    .select("id, email, role, suspended_at")
    .eq("id", user.id)
    .maybeSingle();

  // Deliberately the same answer for "not an admin" and "no such profile": a
  // console that distinguishes them tells a stranger whether an account exists.
  if (!profile || profile.role !== "admin" || profile.suspended_at) {
    return {
      actor: null,
      response: NextResponse.json({ error: "Not allowed." }, { status: 403 }),
    };
  }

  return { actor: { id: profile.id, email: profile.email }, response: null };
}

// Maps a database exception to something the console can show. Anything not
// listed is deliberately vague: an operator sees "could not complete", and the
// detail goes to the server log where it belongs.
export function adminError(message: string): { error: string; status: number } {
  const map: Record<string, { error: string; status: number }> = {
    NOT_ADMIN: { error: "Not allowed.", status: 403 },
    NOT_AUTHENTICATED: { error: "Not signed in.", status: 401 },
    ACTOR_SUSPENDED: { error: "Your own account is suspended.", status: 403 },
    USER_NOT_FOUND: { error: "That user no longer exists.", status: 404 },
    CANNOT_TARGET_SELF: { error: "You cannot do this to your own account.", status: 400 },
    LAST_ADMIN: { error: "This is the only admin left — promote someone else first.", status: 400 },
    REASON_REQUIRED: { error: "Give a reason. It goes in the audit log.", status: 400 },
    DELTA_TOO_LARGE: { error: "That is more than 500 credits in one go.", status: 400 },
    NO_CHANGE: { error: "That would change nothing.", status: 400 },
    BAD_ROLE: { error: "Unknown role.", status: 400 },
    BAD_PLAN: { error: "Unknown plan.", status: 400 },
  };
  for (const key of Object.keys(map)) {
    if (message.includes(key)) return map[key];
  }
  return { error: "Could not complete that action.", status: 500 };
}

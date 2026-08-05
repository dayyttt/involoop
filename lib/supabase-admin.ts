import { createClient } from "@supabase/supabase-js";

// Service-role client: only ever imported inside app/api/** route handlers
// (server-only), never inside client components. It bypasses RLS on purpose
// so we can read/write public invoice pages and cross-user referral records.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

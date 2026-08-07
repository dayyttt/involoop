import { createClient } from "@supabase/supabase-js";

// Service-role client: only ever imported inside server code (route handlers and
// server-only modules), never inside client components. It bypasses RLS on
// purpose so we can read/write public invoice pages and cross-user referral
// records.
//
// Every request goes out with cache: "no-store". Next.js keeps its own Data
// Cache in front of fetch, and supabase-js is built on fetch, so a read here can
// otherwise be answered from a copy taken minutes or deployments ago. That is
// how the PDF route came to print an invoice number the database had already
// changed, while the page beside it printed the new one — the same function,
// two different cached answers. Nothing this client reads is ever safe to serve
// stale: it is invoice amounts, payment status, and plan quotas.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}

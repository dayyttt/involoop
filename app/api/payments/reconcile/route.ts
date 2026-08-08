import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAndSettle } from "@/lib/crypto-payment";

export const dynamic = "force-dynamic";

// The safety net for payments nobody is watching: a payer who sent the money
// and closed the tab leaves an "awaiting_payment" row behind, and nothing on
// their screen will ever ask the chain again. Vercel Cron calls this path; it
// sweeps the live requests and settles whatever can be proven, so a confirmed
// transaction is never left hanging on a webhook that might not arrive.
//
// Every individual settle is the same idempotent code the page poller and the
// webhook use, so running this alongside them is harmless — the second caller
// just finds the work already done.

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!expected || !header || !header.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Skip rows a page is actively polling right now: they do not need this
  // sweep, and skipping them keeps redundant RPC calls off the bill. Also skip
  // rows that have been retried many times without settling — the chain has
  // had long enough, they surface in admin_unmatched_payments as stuck, and a
  // dead reference should not keep costing a lookup every five minutes.
  const { data: live, error } = await admin
    .from("crypto_payments")
    .select("payment_reference, status")
    .in("status", ["awaiting_payment", "detected", "verifying"])
    .lt("updated_at", new Date(Date.now() - 30_000).toISOString())
    .lt("attempts", 10);

  if (error) {
    return NextResponse.json({ error: "Could not read payments" }, { status: 500 });
  }

  let confirmed = 0;
  let errors = 0;
  for (const row of live ?? []) {
    try {
      const result = await checkAndSettle(row.payment_reference);
      if (result.status === "confirmed") confirmed++;
    } catch {
      // One bad row must not stall the whole sweep.
      errors++;
    }
  }

  return NextResponse.json({ checked: live?.length ?? 0, confirmed, errors });
}

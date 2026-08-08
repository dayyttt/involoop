import { NextRequest, NextResponse } from "next/server";
import { checkAndSettle } from "@/lib/crypto-payment";

export const dynamic = "force-dynamic";

// Polling and reconciliation are the same thing, so this endpoint is both.
// The payer's page calls it every few seconds; a cron can call it for requests
// nobody is watching. Neither is trusted to report anything — it reads the
// chain itself and settles only what it can prove.
//
// It is public by design (the payer has no account), and every call can end in
// an RPC lookup, which on mainnet is real money. A best-effort per-IP throttle
// caps the obvious abuse; it is not pretending to be a distributed limiter.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 90;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json({ status: "busy" }, { status: 429 });
  }

  const result = await checkAndSettle(reference);
  return NextResponse.json(result);
}

import type { NextRequest } from "next/server";

/**
 * A per-IP throttle for endpoints that must stay open to people without an
 * account: the client paying an invoice, the visitor trying the demo.
 *
 * What it is honest about: this counts in the memory of one serverless
 * instance. Vercel runs several and replaces them freely, so a determined
 * attacker with concurrency gets a multiple of these numbers. It stops scripts
 * and accidents, not a adversary — anything stronger needs shared state, and
 * that is a dependency this project does not have yet.
 *
 * What it is not: a defence for anything that moves money. Those paths are
 * guarded by ownership checks and the chain, not by counting.
 */
const buckets = new Map<string, Map<string, number[]>>();

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimited(
  name: string,
  ip: string,
  { windowMs, max }: { windowMs: number; max: number }
): boolean {
  let hits = buckets.get(name);
  if (!hits) {
    hits = new Map();
    buckets.set(name, hits);
  }
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  // Unbounded growth is its own denial of service. Dropping everything is
  // crude, but the alternative is a sweep on every request.
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

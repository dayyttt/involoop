import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAndSettle } from "@/lib/crypto-payment";

export const dynamic = "force-dynamic";

// Notification from the RPC provider that something touched an address we care
// about. Treated as a nudge and nothing more: the body is never believed, and
// every claim is re-derived from the chain by checkAndSettle.
//
// PayPal taught this the expensive way — its sandbox approved a signature that
// was the literal string "tanda-tangan-palsu", and a forged event was accepted
// in production. Here it costs nothing to be strict, because the chain is
// public and anyone can read the truth from it.
const MAX_BODY = 256 * 1024;

function secretMatches(header: string | null): boolean {
  const expected = process.env.SOLANA_WEBHOOK_SECRET;
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // Compare lengths first: timingSafeEqual throws on a mismatch, and the throw
  // itself would leak the length.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!secretMatches(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // Providers differ in shape; all we want is which references were touched.
  const events = Array.isArray(payload) ? payload : [payload];
  const references = new Set<string>();
  for (const event of events) {
    const keys: unknown[] = event?.accountKeys ?? event?.transaction?.message?.accountKeys ?? [];
    for (const key of keys) {
      const address = typeof key === "string" ? key : (key as { pubkey?: string })?.pubkey;
      if (address) references.add(address);
    }
    if (typeof event?.reference === "string") references.add(event.reference);
  }

  const admin = createAdminClient();
  // Idempotent event id: derived from the body, so a provider retrying the
  // exact same webhook is recorded once instead of leaking duplicate rows.
  const eventId = `solana_${createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
  await admin
    .from("webhook_events")
    .upsert(
      {
        provider: "solana",
        provider_event_id: eventId,
        event_type: "account.activity",
        status: "received",
      },
      { onConflict: "provider_event_id", ignoreDuplicates: true }
    );

  // Only references we actually issued. A webhook naming an unknown address is
  // noise, not an instruction.
  const { data: known } = await admin
    .from("crypto_payments")
    .select("payment_reference")
    .in("payment_reference", Array.from(references).filter(Boolean))
    .neq("status", "confirmed");

  let settled = 0;
  for (const row of known ?? []) {
    const result = await checkAndSettle(row.payment_reference);
    if (result.status === "confirmed") settled++;
  }

  await admin
    .from("webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("provider_event_id", eventId);

  return NextResponse.json({ ok: true, checked: known?.length ?? 0, settled });
}

import { NextRequest, NextResponse } from "next/server";
import { checkAndSettle } from "@/lib/crypto-payment";

export const dynamic = "force-dynamic";

// Polling and reconciliation are the same thing, so this endpoint is both.
// The payer's page calls it every few seconds; a cron can call it for requests
// nobody is watching. Neither is trusted to report anything — it reads the
// chain itself and settles only what it can prove.
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }
  const result = await checkAndSettle(reference);
  return NextResponse.json(result);
}

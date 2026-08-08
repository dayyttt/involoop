import { NextResponse } from "next/server";
import { solanaConfigured, solanaNetwork, platformWallet } from "@/lib/solana";
import { paypalLive } from "@/lib/paypal";

export const dynamic = "force-dynamic";

// What crypto can actually do here, answered by the server.
//
// The two directions have different requirements and the browser cannot see
// either of them: the platform wallet is server-only, and whether a given
// freelancer has connected one is per-invoice. Rather than let a page guess,
// it asks — and a button that cannot work is never drawn.
export async function GET() {
  const configured = solanaConfigured();
  return NextResponse.json({
    // Direction B: paying Involoop for a plan. Needs only the platform address.
    plan: configured && !!platformWallet(),
    network: configured ? solanaNetwork() : null,
    // So a payment surface can label itself truthfully instead of guessing.
    paypalLive: paypalLive(),
  });
}

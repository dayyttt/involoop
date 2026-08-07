import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isValidAddress, newPaymentReference } from "@/lib/solana";

export const dynamic = "force-dynamic";

// Step one of proving a wallet belongs to this account: the server invents the
// challenge, so the wallet cannot be handed a message it prepared earlier.
//
// The message says plainly what signing does and does not do. Anyone who has
// been phished once reads these carefully, and they should be able to.
export async function POST(req: Request) {
  const { wallet } = await req.json().catch(() => ({}));

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (typeof wallet !== "string" || !isValidAddress(wallet)) {
    return NextResponse.json({ error: "That is not a Solana address." }, { status: 400 });
  }

  const nonce = newPaymentReference();
  const issued = new Date();
  const expires = new Date(issued.getTime() + 10 * 60 * 1000);
  const domain = process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, "") ?? "involoop.vercel.app";

  const { error } = await createAdminClient().from("wallet_nonces").insert({
    user_id: user.id,
    nonce,
    wallet_address: wallet,
    expires_at: expires.toISOString(),
  });
  if (error) {
    console.error("nonce insert", error.message);
    return NextResponse.json({ error: "Could not start verification." }, { status: 500 });
  }

  const message = [
    "Sign this message to connect your Solana wallet to Involoop.",
    "",
    "This proves you control this address. It does not authorize any",
    "transaction, transfer, or spending approval.",
    "",
    `Wallet:    ${wallet}`,
    `Account:   ${user.id}`,
    `Domain:    ${domain}`,
    `Nonce:     ${nonce}`,
    `Issued at: ${issued.toISOString()}`,
    `Expires:   ${expires.toISOString()}`,
  ].join("\n");

  return NextResponse.json({ nonce, message });
}

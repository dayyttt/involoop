import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isValidAddress, verifySignedMessage } from "@/lib/solana";

export const dynamic = "force-dynamic";

// Step two: the signature is checked against the address, and the challenge is
// spent. A nonce that has been used, has expired, or belongs to someone else is
// refused — otherwise a signature captured once could be replayed forever.
export async function POST(req: Request) {
  const { wallet, signature, nonce, message } = await req.json().catch(() => ({}));

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (
    typeof wallet !== "string" ||
    typeof signature !== "string" ||
    typeof nonce !== "string" ||
    typeof message !== "string" ||
    !isValidAddress(wallet)
  ) {
    return NextResponse.json({ error: "Incomplete request." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: challenge } = await admin
    .from("wallet_nonces")
    .select("id, user_id, wallet_address, used_at, expires_at")
    .eq("nonce", nonce)
    .maybeSingle();

  const now = Date.now();
  if (
    !challenge ||
    challenge.user_id !== user.id ||
    challenge.wallet_address !== wallet ||
    challenge.used_at ||
    new Date(challenge.expires_at).getTime() < now
  ) {
    return NextResponse.json({ error: "This request expired. Try again." }, { status: 400 });
  }

  // The message must contain the nonce we issued, so a wallet cannot be talked
  // into signing some other text that happens to verify.
  if (!message.includes(nonce) || !message.includes(wallet)) {
    return NextResponse.json({ error: "That message does not match." }, { status: 400 });
  }

  if (!verifySignedMessage(message, signature, wallet)) {
    return NextResponse.json({ error: "That signature is not valid for this address." }, { status: 400 });
  }

  // Spend the challenge first. If the update below fails, the worst case is a
  // wasted nonce rather than a reusable one.
  await admin.from("wallet_nonces").update({ used_at: new Date().toISOString() }).eq("id", challenge.id);

  const { error } = await admin
    .from("profiles")
    .update({ solana_wallet: wallet, solana_wallet_verified_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("wallet save", error.message);
    return NextResponse.json({ error: "Could not save your wallet." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, wallet });
}

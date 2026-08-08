import { NextRequest, NextResponse } from "next/server";
import {
  address,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  createSolanaRpc,
  createTransactionMessage,
  getCompiledTransactionMessageEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  AccountRole,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import bs58 from "bs58";
import { createAdminClient } from "@/lib/supabase-admin";
import { USDC_DECIMALS } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const b58 = (bs58 as unknown as { default?: typeof bs58 }).default ?? bs58;

// Builds the payment as an unsigned transaction the payer's wallet can sign.
//
// The `solana:` deep link only works where an app has registered that scheme —
// a phone. On a desktop with a browser extension nothing handles it, and the
// browser says so: "the scheme does not have a registered handler". That is not
// a misconfiguration, it is what desktop does.
//
// So the desktop path builds the transaction here and hands it over already
// composed. The wallet only signs and sends. Everything that decides money —
// recipient, amount, mint, reference — is read from the database on this side,
// exactly as it is for the QR, so the two paths cannot disagree about what is
// owed.
export async function POST(req: NextRequest) {
  const { reference, payer } = await req.json().catch(() => ({}));
  if (typeof reference !== "string" || typeof payer !== "string") {
    return NextResponse.json({ error: "reference and payer are required" }, { status: 400 });
  }

  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data: request } = await createAdminClient()
    .from("crypto_payments")
    .select("status, recipient_wallet, expected_amount_minor, token_mint, expires_at")
    .eq("payment_reference", reference)
    .maybeSingle();

  if (!request) return NextResponse.json({ error: "Unknown payment request." }, { status: 404 });
  if (request.status === "confirmed") {
    return NextResponse.json({ error: "Already paid." }, { status: 409 });
  }
  if (new Date(request.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This request expired." }, { status: 409 });
  }

  try {
    const rpc = createSolanaRpc(rpcUrl);
    const mint = address(request.token_mint);
    const from = address(payer);
    const to = address(request.recipient_wallet);

    const [payerAta] = await findAssociatedTokenPda({
      owner: from,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      mint,
    });
    const [recipientAta] = await findAssociatedTokenPda({
      owner: to,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
      mint,
    });

    // Without USDC there is nothing to send, and the wallet's own error for
    // this is unreadable. Say it plainly before building anything.
    const payerAccount = await rpc.getAccountInfo(payerAta, { encoding: "base64" }).send();
    if (!payerAccount.value) {
      return NextResponse.json({ error: "no_usdc", reason: "no_usdc" }, { status: 409 });
    }
    const balance = await rpc.getTokenAccountBalance(payerAta).send();
    if (BigInt(balance.value.amount) < BigInt(request.expected_amount_minor)) {
      return NextResponse.json(
        {
          error: "insufficient",
          reason: "insufficient",
          have: balance.value.uiAmountString,
        },
        { status: 409 }
      );
    }

    const instructions: any[] = [];

    // An SPL transfer to an address with no token account fails outright. The
    // idempotent variant is safe whether or not it already exists.
    const recipientAccount = await rpc.getAccountInfo(recipientAta, { encoding: "base64" }).send();
    if (!recipientAccount.value) {
      instructions.push(
        getCreateAssociatedTokenIdempotentInstruction({
          payer: { address: from } as never,
          owner: to,
          mint,
          ata: recipientAta,
        })
      );
    }

    const transfer = getTransferCheckedInstruction({
      source: payerAta,
      mint,
      destination: recipientAta,
      authority: { address: from } as never,
      amount: BigInt(request.expected_amount_minor),
      decimals: USDC_DECIMALS,
    });

    // The reference rides along as a read-only account, which is how Solana Pay
    // makes a transaction findable later without the payer telling us anything.
    instructions.push({
      ...transfer,
      accounts: [...transfer.accounts, { address: address(reference), role: AccountRole.READONLY }],
    });

    const { value: blockhash } = await rpc.getLatestBlockhash().send();
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(from, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
      (m) => instructions.reduce((acc, ix) => appendTransactionMessageInstruction(ix, acc), m)
    );

    const compiled = compileTransactionMessage(message as never);
    const bytes = getCompiledTransactionMessageEncoder().encode(compiled);

    return NextResponse.json({ message: b58.encode(new Uint8Array(bytes)) });
  } catch (err: any) {
    console.error("build crypto tx", err?.message ?? err);
    return NextResponse.json({ error: "Could not build the transaction." }, { status: 500 });
  }
}

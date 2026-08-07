import nacl from "tweetnacl";
import bs58 from "bs58";

// Server-side Solana, over plain JSON-RPC.
//
// No @solana/web3.js and no wallet adapter. Everything needed here is four RPC
// methods, a URL format, and an ed25519 signature check — about 450KB of
// dependency instead of several megabytes, which matters because the public
// invoice page is opened on phones over mobile data by people who did not
// choose to visit it.
//
// Nothing in this file trusts a caller. Amounts, recipients and mints are read
// from the database; the chain is asked what actually happened; and a claim
// that does not match in every particular is refused.

const b58 = (bs58 as unknown as { default?: typeof bs58 }).default ?? bs58;

export type SolanaNetwork = "solana-devnet" | "solana-mainnet";

// Mint addresses, never token names. Anyone can mint a token and call it USDC;
// only the address is an identity.
const USDC_MINT: Record<SolanaNetwork, string> = {
  "solana-devnet": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  "solana-mainnet": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

export const USDC_DECIMALS = 6;

export function solanaNetwork(): SolanaNetwork {
  return process.env.SOLANA_NETWORK === "solana-mainnet" ? "solana-mainnet" : "solana-devnet";
}

export function usdcMint(network: SolanaNetwork = solanaNetwork()): string {
  // An override is allowed for a local validator, but only for devnet: a wrong
  // mainnet mint means real money sent to a token nobody wants.
  const override = process.env.SOLANA_USDC_MINT;
  if (override && network === "solana-devnet") return override;
  return USDC_MINT[network];
}

export function solanaConfigured(): boolean {
  return !!process.env.SOLANA_RPC_URL;
}

// Direction B only. Without it, plan purchases in USDC are simply not offered —
// far better than collecting money at an address nobody controls.
export function platformWallet(): string | null {
  const addr = process.env.SOLANA_PLATFORM_WALLET;
  return addr && isValidAddress(addr) ? addr : null;
}

export function explorerTx(signature: string, network: SolanaNetwork = solanaNetwork()): string {
  const cluster = network === "solana-devnet" ? "?cluster=devnet" : "";
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

/** A Solana address is 32 bytes, base58 encoded. Anything else is not one. */
export function isValidAddress(value: string): boolean {
  try {
    return b58.decode(value).length === 32;
  } catch {
    return false;
  }
}

/**
 * A fresh, random marker included in the payment as a read-only account.
 * Solana Pay uses it to find the transaction later: it is public, unguessable,
 * and belongs to exactly one payment request.
 */
export function newPaymentReference(): string {
  return b58.encode(nacl.randomBytes(32));
}

/**
 * Proof that someone controls an address, and nothing more.
 * A signature over a message authorises no transfer and grants no spending
 * approval — which is why the message the user sees says so in those words.
 */
export function verifySignedMessage(message: string, signatureB58: string, addressB58: string): boolean {
  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(message),
      b58.decode(signatureB58),
      b58.decode(addressB58)
    );
  } catch {
    return false;
  }
}

/**
 * Dollar cents to USDC base units.
 *
 * Both are "minor units" and that is exactly the trap: an invoice stores $50 as
 * 5000 cents, while USDC has six decimals, so the same fifty dollars is
 * 50000000. Passing one where the other belongs is a ten-thousand-fold error in
 * the direction of the payer's favour, and it looks entirely plausible on
 * screen — 0.005 USDC is a real number.
 */
export function usdMinorToUsdcMinor(usdMinor: number): number {
  return Math.round(usdMinor) * 10 ** (USDC_DECIMALS - 2);
}

/** Minor units to the decimal string a Solana Pay URL expects. String maths, not floats. */
export function toTokenAmount(minor: number, decimals = USDC_DECIMALS): string {
  const negative = minor < 0;
  const digits = Math.abs(Math.round(minor)).toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const frac = digits.slice(digits.length - decimals).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`;
}

export function buildSolanaPayUrl(input: {
  recipient: string;
  amountMinor: number;
  mint: string;
  reference: string;
  label: string;
  message: string;
}): string {
  const params = new URLSearchParams({
    amount: toTokenAmount(input.amountMinor),
    "spl-token": input.mint,
    reference: input.reference,
    label: input.label,
    message: input.message,
  });
  return `solana:${input.recipient}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// RPC
// ---------------------------------------------------------------------------

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const url = process.env.SOLANA_RPC_URL;
  if (!url) throw new Error("SOLANA_RPC_NOT_CONFIGURED");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RPC_HTTP_${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`RPC_${body.error.code}: ${body.error.message}`);
  return body.result as T;
}

/**
 * Every transaction that touched this reference. Solana Pay's discovery step:
 * the payer never tells us their signature, we find it ourselves.
 */
export async function findSignaturesForReference(reference: string, limit = 10): Promise<string[]> {
  const result = await rpc<{ signature: string; err: unknown }[]>("getSignaturesForAddress", [
    reference,
    { limit },
  ]);
  return (result ?? []).filter((r) => !r.err).map((r) => r.signature);
}

export interface VerifiedTransfer {
  signature: string;
  mint: string;
  recipientOwner: string;
  amountMinor: number;
  payer: string | null;
  blockTime: number | null;
}

export interface VerifyInput {
  signature: string;
  expectedRecipient: string;
  expectedAmountMinor: number;
  expectedMint: string;
  expectedReference: string;
  notBefore: Date;
}

export type VerifyResult =
  | { ok: true; transfer: VerifiedTransfer }
  | { ok: false; reason: string };

/**
 * Ask the chain what happened, then refuse anything that does not match on
 * every point. This is the only place a payment is allowed to become real, and
 * it is deliberately unforgiving: a near-miss is a no.
 */
export async function verifyUsdcTransfer(input: VerifyInput): Promise<VerifyResult> {
  let tx: any;
  try {
    tx = await rpc<any>("getTransaction", [
      input.signature,
      { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
    ]);
  } catch (err: any) {
    return { ok: false, reason: `rpc_error:${err?.message ?? "unknown"}` };
  }

  // Not found under `finalized` usually means "not finalized yet", which is a
  // wait rather than a failure. The caller retries; it must not settle.
  if (!tx) return { ok: false, reason: "not_finalized" };
  if (tx.meta?.err) return { ok: false, reason: "transaction_failed" };

  const blockTime: number | null = tx.blockTime ?? null;
  if (blockTime && blockTime * 1000 < input.notBefore.getTime() - 60_000) {
    // An older transaction cannot pay a request that did not exist yet. The
    // minute of slack absorbs clock skew between our server and the cluster.
    return { ok: false, reason: "transaction_predates_request" };
  }

  // The reference must actually appear in the transaction's accounts, or this
  // is somebody else's payment that happens to have the right shape.
  const accountKeys: string[] = (tx.transaction?.message?.accountKeys ?? []).map((k: any) =>
    typeof k === "string" ? k : k.pubkey
  );
  if (!accountKeys.includes(input.expectedReference)) {
    return { ok: false, reason: "reference_absent" };
  }

  // Read the balance change rather than the instruction: it survives transfers
  // routed through a program, and it cannot be faked by naming a token "USDC".
  const pre: any[] = tx.meta?.preTokenBalances ?? [];
  const post: any[] = tx.meta?.postTokenBalances ?? [];

  const matching = post.filter(
    (b) => b.mint === input.expectedMint && b.owner === input.expectedRecipient
  );
  if (matching.length === 0) {
    return { ok: false, reason: "no_transfer_to_recipient" };
  }

  let received = 0;
  for (const after of matching) {
    const before = pre.find(
      (b) => b.accountIndex === after.accountIndex && b.mint === after.mint
    );
    const beforeAmount = Number(before?.uiTokenAmount?.amount ?? 0);
    const afterAmount = Number(after?.uiTokenAmount?.amount ?? 0);
    if (after?.uiTokenAmount?.decimals !== USDC_DECIMALS) {
      return { ok: false, reason: "wrong_decimals" };
    }
    received += afterAmount - beforeAmount;
  }

  if (received <= 0) return { ok: false, reason: "no_transfer_to_recipient" };
  // Underpayment is refused outright: half an invoice is not a paid invoice,
  // and quietly accepting it would leave the freelancer short with no record of
  // why. Overpayment settles — the money arrived — and the surplus is reported
  // rather than pocketed.
  if (received < input.expectedAmountMinor) {
    return { ok: false, reason: `underpaid:${received}` };
  }

  const payer =
    pre.find((b) => b.mint === input.expectedMint && b.owner !== input.expectedRecipient)?.owner ??
    accountKeys[0] ??
    null;

  return {
    ok: true,
    transfer: {
      signature: input.signature,
      mint: input.expectedMint,
      recipientOwner: input.expectedRecipient,
      amountMinor: received,
      payer,
      blockTime,
    },
  };
}

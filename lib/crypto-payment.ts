import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  buildSolanaPayUrl,
  findSignaturesForReference,
  newPaymentReference,
  solanaConfigured,
  solanaNetwork,
  toTokenAmount,
  usdcMint,
  USDC_DECIMALS,
  verifyUsdcTransfer,
  explorerTx,
  usdMinorToUsdcMinor,
} from "@/lib/solana";

// Creating a USDC payment request, and deciding whether one has been paid.
//
// Both directions come through here. What differs is only who receives the
// money and what happens when it arrives; everything about proving it arrived
// is identical, and lives in one place so it cannot drift apart.
//
// The important structural choice: checking a payment is the same code path as
// reconciling one. The page polls it, the webhook triggers it, a cron calls it.
// That means the system is correct even if a webhook never arrives — which is
// the only assumption worth making about webhooks.

const REQUEST_TTL_MINUTES = 30;

export interface CryptoRequest {
  reference: string;
  url: string;
  /** Data URI. Generated here so the browser does not need a QR library. */
  qr: string;
  amount: string;
  amountMinor: number;
  recipient: string;
  network: string;
  mint: string;
  expiresAt: string;
}

export type CreateResult =
  | { ok: true; request: CryptoRequest }
  | { ok: false; reason: string };

/**
 * Direction A — a client paying an invoice.
 * Recipient is the freelancer's verified wallet, frozen into the request so a
 * later wallet change cannot redirect an invoice already in someone's inbox.
 */
export async function createInvoiceRequest(publicId: string): Promise<CreateResult> {
  if (!solanaConfigured()) return { ok: false, reason: "not_configured" };

  const admin = createAdminClient();
  const { data: invoice } = await admin
    .from("invoices")
    .select("id, public_id, number, description, amount_minor, currency, status, owner_id")
    .eq("public_id", publicId)
    .maybeSingle();

  if (!invoice) return { ok: false, reason: "invoice_not_found" };
  if (invoice.status !== "unpaid" && invoice.status !== "payment_pending") {
    return { ok: false, reason: "already_processed" };
  }
  // USDC settles one-for-one against dollars. Any other currency would need a
  // rate, and a rate invented at payment time is a rate nobody agreed to.
  if (invoice.currency !== "USD") return { ok: false, reason: "currency_not_usd" };

  const { data: owner } = await admin
    .from("profiles")
    .select("solana_wallet, solana_wallet_verified_at")
    .eq("id", invoice.owner_id)
    .maybeSingle();

  if (!owner?.solana_wallet || !owner.solana_wallet_verified_at) {
    return { ok: false, reason: "owner_has_no_wallet" };
  }

  // An unfinished request for this invoice is reused rather than replaced:
  // reopening the page must not strand a payer who already scanned the QR.
  const existing = await findLiveRequest({ invoiceId: invoice.id });
  if (existing) return { ok: true, request: existing };

  return createRequest({
    purpose: "invoice",
    invoiceId: invoice.id,
    userId: null,
    planKey: null,
    // Cents to USDC base units. The invoice is denominated in USD; USDC has
    // six decimals where dollars have two.
    amountMinor: usdMinorToUsdcMinor(Number(invoice.amount_minor)),
    recipient: owner.solana_wallet,
    label: `Involoop · ${invoice.number}`,
    message: invoice.description?.slice(0, 90) || `Invoice ${invoice.number}`,
  });
}

/**
 * Direction B — someone buying a plan.
 * Recipient is Involoop's own wallet. Involoop is the payee here, which is why
 * a failure after the money moves is a debt rather than an inconvenience.
 */
export async function createPlanRequest(
  userId: string,
  plan: "starter" | "pro",
  priceUsdMinor: number
): Promise<CreateResult> {
  if (!solanaConfigured()) return { ok: false, reason: "not_configured" };

  const platform = process.env.SOLANA_PLATFORM_WALLET;
  if (!platform) return { ok: false, reason: "platform_wallet_missing" };

  const existing = await findLiveRequest({ userId, planKey: plan });
  if (existing) return { ok: true, request: existing };

  return createRequest({
    purpose: "plan",
    invoiceId: null,
    userId,
    planKey: plan,
    amountMinor: usdMinorToUsdcMinor(priceUsdMinor),
    recipient: platform,
    label: `Involoop ${plan === "pro" ? "Pro · 30 days" : "Starter"}`,
    message: "Involoop plan purchase",
  });
}

async function findLiveRequest(match: {
  invoiceId?: string;
  userId?: string;
  planKey?: string;
}): Promise<CryptoRequest | null> {
  const admin = createAdminClient();
  let query = admin
    .from("crypto_payments")
    .select(
      "payment_reference, recipient_wallet, expected_amount_minor, network, token_mint, expires_at, status, payments!inner(invoice_id, user_id, plan_key, status)"
    )
    .in("status", ["awaiting_payment", "detected", "verifying"])
    .gt("expires_at", new Date().toISOString());

  if (match.invoiceId) query = query.eq("payments.invoice_id", match.invoiceId);
  if (match.userId) query = query.eq("payments.user_id", match.userId);
  if (match.planKey) query = query.eq("payments.plan_key", match.planKey);

  const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;

  const reuseUrl = buildSolanaPayUrl({
    recipient: data.recipient_wallet,
    amountMinor: Number(data.expected_amount_minor),
    mint: data.token_mint,
    reference: data.payment_reference,
    label: "Involoop",
    message: "Involoop payment",
  });
  return {
    reference: data.payment_reference,
    qr: await renderQr(reuseUrl),
    url: buildSolanaPayUrl({
      recipient: data.recipient_wallet,
      amountMinor: Number(data.expected_amount_minor),
      mint: data.token_mint,
      reference: data.payment_reference,
      label: "Involoop",
      message: "Involoop payment",
    }),
    amount: toTokenAmount(Number(data.expected_amount_minor)),
    amountMinor: Number(data.expected_amount_minor),
    recipient: data.recipient_wallet,
    network: data.network,
    mint: data.token_mint,
    expiresAt: data.expires_at,
  };
}

async function createRequest(input: {
  purpose: "invoice" | "plan";
  invoiceId: string | null;
  userId: string | null;
  planKey: string | null;
  amountMinor: number;
  recipient: string;
  label: string;
  message: string;
}): Promise<CreateResult> {
  const admin = createAdminClient();
  const network = solanaNetwork();
  const mint = usdcMint(network);
  const reference = newPaymentReference();
  const expiresAt = new Date(Date.now() + REQUEST_TTL_MINUTES * 60 * 1000).toISOString();

  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      invoice_id: input.invoiceId,
      user_id: input.userId,
      purpose: input.purpose,
      plan_key: input.planKey,
      provider: "solana",
      provider_session_id: reference,
      // The ledger stays in cents like every other payment, so platform totals
      // can be added up across rails. The USDC figure lives on crypto_payments.
      amount_minor: Math.round(input.amountMinor / 10 ** 4),
      currency: "USD",
      status: "created",
    })
    .select("id")
    .single();

  if (payErr || !payment) {
    console.error("crypto payment insert", payErr?.message);
    return { ok: false, reason: "could_not_create" };
  }

  const { error: cryptoErr } = await admin.from("crypto_payments").insert({
    payment_id: payment.id,
    network,
    token_mint: mint,
    token_decimals: USDC_DECIMALS,
    recipient_wallet: input.recipient,
    expected_amount_minor: input.amountMinor,
    payment_reference: reference,
    expires_at: expiresAt,
  });

  if (cryptoErr) {
    console.error("crypto_payments insert", cryptoErr.message);
    await admin.from("payments").delete().eq("id", payment.id);
    return { ok: false, reason: "could_not_create" };
  }

  if (input.purpose === "invoice" && input.invoiceId) {
    await admin
      .from("invoices")
      .update({ status: "payment_pending" })
      .eq("id", input.invoiceId)
      .eq("status", "unpaid");
  }

  const url = buildSolanaPayUrl({
    recipient: input.recipient,
    amountMinor: input.amountMinor,
    mint,
    reference,
    label: input.label,
    message: input.message,
  });

  return {
    ok: true,
    request: {
      reference,
      qr: await renderQr(url),
      url: buildSolanaPayUrl({
        recipient: input.recipient,
        amountMinor: input.amountMinor,
        mint,
        reference,
        label: input.label,
        message: input.message,
      }),
      amount: toTokenAmount(input.amountMinor),
      amountMinor: input.amountMinor,
      recipient: input.recipient,
      network,
      mint,
      expiresAt,
    },
  };
}

export interface SettleResult {
  status: "awaiting_payment" | "detected" | "verifying" | "confirmed" | "failed" | "expired";
  signature?: string | null;
  explorer?: string | null;
  reason?: string;
  /** How much more than asked arrived, if any. Reported, never pocketed. */
  overpaidMinor?: number;
}

/**
 * Ask the chain whether this request has been paid, and settle it if so.
 *
 * Safe to call from anywhere, as often as anyone likes. The database function
 * it ends in is idempotent, so the page polling, the webhook firing and a cron
 * sweeping can all arrive at once and the second one simply finds the work
 * already done.
 */
export async function checkAndSettle(reference: string): Promise<SettleResult> {
  const admin = createAdminClient();

  const { data: request } = await admin
    .from("crypto_payments")
    .select(
      "id, status, transaction_signature, recipient_wallet, expected_amount_minor, token_mint, payment_reference, expires_at, created_at, network"
    )
    .eq("payment_reference", reference)
    .maybeSingle();

  if (!request) return { status: "failed", reason: "request_not_found" };

  if (request.status === "confirmed") {
    return {
      status: "confirmed",
      signature: request.transaction_signature,
      explorer: request.transaction_signature ? explorerTx(request.transaction_signature) : null,
    };
  }

  const expired = new Date(request.expires_at).getTime() < Date.now();

  let signatures: string[] = [];
  try {
    signatures = await findSignaturesForReference(reference);
  } catch (err: any) {
    // The chain being unreachable is not the payer's fault and must not look
    // like a rejection. Report it as still waiting and try again next poll.
    console.error("solana lookup", err?.message);
    return { status: request.status as SettleResult["status"], reason: "rpc_unavailable" };
  }

  if (signatures.length === 0) {
    if (expired) {
      await admin
        .from("crypto_payments")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", request.id)
        .neq("status", "confirmed");
      return { status: "expired" };
    }
    return { status: "awaiting_payment" };
  }

  // Something touched the reference. Say so before verification finishes, so a
  // payer who has just tapped Send is not left looking at "waiting".
  if (request.status === "awaiting_payment") {
    await admin
      .from("crypto_payments")
      .update({ status: "detected", detected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", request.id);
  }

  let lastReason = "not_finalized";
  for (const signature of signatures) {
    const verified = await verifyUsdcTransfer({
      signature,
      expectedRecipient: request.recipient_wallet,
      expectedAmountMinor: Number(request.expected_amount_minor),
      expectedMint: request.token_mint,
      expectedReference: reference,
      notBefore: new Date(request.created_at),
    });

    if (!verified.ok) {
      lastReason = verified.reason;
      continue;
    }

    const { error } = await admin.rpc("confirm_crypto_payment", {
      p_reference: reference,
      p_signature: signature,
      p_payer: verified.transfer.payer,
      p_commitment: "finalized",
    });

    if (error) {
      console.error("confirm_crypto_payment", error.message);
      await admin
        .from("crypto_payments")
        .update({ last_error: error.message, updated_at: new Date().toISOString() })
        .eq("id", request.id);
      return { status: "verifying", reason: "settlement_failed" };
    }

    const over = verified.transfer.amountMinor - Number(request.expected_amount_minor);
    return {
      status: "confirmed",
      signature,
      explorer: explorerTx(signature, request.network as any),
      ...(over > 0 ? { overpaidMinor: over } : {}),
    };
  }

  // Seen but not settled: usually simply not finalized yet.
  await admin
    .from("crypto_payments")
    .update({
      status: "verifying",
      last_error: lastReason,
      attempts: (await bumpAttempts(request.id)) ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id)
    .neq("status", "confirmed");

  return { status: "verifying", reason: lastReason };
}

async function bumpAttempts(id: string): Promise<number | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("crypto_payments").select("attempts").eq("id", id).maybeSingle();
  return (data?.attempts ?? 0) + 1;
}

/**
 * The payment as a QR a phone wallet can scan. Dark on light on purpose: a
 * camera reads that far more reliably than a low-contrast code styled to match
 * the page, and a code that will not scan is worse than an ugly one.
 */
async function renderQr(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 260,
      color: { dark: "#1b1420", light: "#ffffff" },
    });
  } catch {
    return "";
  }
}

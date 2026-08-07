// Server-only PayPal client. Orders v2 over REST — PayPal's Node SDK is
// deprecated and its replacement adds a dependency for four endpoints we can
// call directly.
//
// Every export here throws or returns null rather than falling back silently:
// a payment rail that quietly does nothing is worse than one that is clearly
// switched off.

const SANDBOX = "https://api-m.sandbox.paypal.com";
const LIVE = "https://api-m.paypal.com";

export function paypalBase(): string {
  return process.env.PAYPAL_ENV === "live" ? LIVE : SANDBOX;
}

export function paypalConfigured(): boolean {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

// PayPal settles in a fixed list of currencies, and IDR is not one of them.
// This is not a limitation we can code around: an IDR invoice simply cannot be
// charged through PayPal, so the invoice page offers manual transfer instead.
// (Every currency below takes two decimals at PayPal; the zero-decimal ones in
// its docs — JPY, HUF, TWD — are not currencies Involoop bills in.)
export const PAYPAL_CURRENCIES = new Set([
  "MYR",
  "SGD",
  "THB",
  "PHP",
  "USD",
  "EUR",
  "GBP",
]);

export function paypalSupportsCurrency(currency: string): boolean {
  return PAYPAL_CURRENCIES.has(currency.toUpperCase());
}

// Amounts live in the database as integer minor units. PayPal wants a decimal
// string. Doing this with string maths rather than floats keeps 48.10 from
// becoming 48.099999999999994.
export function toPaypalAmount(amountMinor: number): string {
  const negative = amountMinor < 0;
  const digits = Math.abs(Math.round(amountMinor)).toString().padStart(3, "0");
  const whole = digits.slice(0, -2);
  const cents = digits.slice(-2);
  return `${negative ? "-" : ""}${whole}.${cents}`;
}

export function fromPaypalAmount(value: string): number {
  return Math.round(Number(value) * 100);
}

// Access tokens last eight hours; this keeps one in module scope so a burst of
// invoice views does not mean a burst of auth calls.
let cachedToken: { value: string; expiresAt: number } | null = null;

export async function paypalToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_NOT_CONFIGURED");

  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PAYPAL_AUTH_FAILED ${res.status}`);
  }
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 0) * 1000,
  };
  return cachedToken.value;
}

async function paypalFetch(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const token = await paypalToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  // PayPal replays a request with the same key instead of charging twice, which
  // matters because a client tapping "Pay" twice is normal behaviour.
  if (init.idempotencyKey) headers["PayPal-Request-Id"] = init.idempotencyKey;

  const res = await fetch(`${paypalBase()}${path}`, { ...init, headers, cache: "no-store" });
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = body?.details?.[0]?.issue ?? body?.name ?? `HTTP_${res.status}`;
    const err = new Error(detail);
    (err as any).status = res.status;
    (err as any).body = body;
    throw err;
  }
  return body;
}

export interface CreateOrderInput {
  amountMinor: number;
  currency: string;
  referenceId: string;
  description: string;
  invoiceNumber: string;
  returnUrl: string;
  cancelUrl: string;
  // The freelancer's own PayPal account. When present the money is routed
  // there instead of to the platform balance.
  payeeEmail?: string | null;
  idempotencyKey?: string;
}

export async function createOrder(input: CreateOrderInput) {
  const purchaseUnit: Record<string, unknown> = {
    reference_id: input.referenceId,
    description: input.description.slice(0, 127),
    invoice_id: input.invoiceNumber,
    amount: {
      currency_code: input.currency.toUpperCase(),
      value: toPaypalAmount(input.amountMinor),
    },
  };
  // Direct payee: the client pays the freelancer, and Involoop never holds the
  // money. Without a stored PayPal address there is nobody to route to, so the
  // sandbox platform account receives it and the UI says so.
  if (input.payeeEmail) {
    purchaseUnit.payee = { email_address: input.payeeEmail };
  }

  return paypalFetch("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
      application_context: {
        brand_name: "Involoop",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });
}

export async function captureOrder(orderId: string) {
  return paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    idempotencyKey: `capture_${orderId}`,
    body: "{}",
  });
}

export async function getOrder(orderId: string) {
  return paypalFetch(`/v2/checkout/orders/${orderId}`, { method: "GET" });
}

// Ask PayPal what it thinks a capture is, rather than believing what arrived in
// a webhook body. Returns null when PayPal has never heard of it.
export async function getCapture(captureId: string): Promise<any | null> {
  try {
    return await paypalFetch(`/v2/payments/captures/${captureId}`, { method: "GET" });
  } catch (err: any) {
    if (err?.status === 404) return null;
    throw err;
  }
}

export function approvalUrl(order: any): string | null {
  const link = (order?.links ?? []).find((l: any) => l.rel === "approve" || l.rel === "payer-action");
  return link?.href ?? null;
}

// PayPal verifies its own signatures server-side: we hand back the headers it
// sent plus the raw body, and it tells us whether it really sent them.
//
// IMPORTANT: in sandbox this endpoint answers SUCCESS for any signature at all.
// Verified by sending it the literal string "tanda-tangan-palsu", which it
// happily approved. So this check is necessary but NOT sufficient, and the
// webhook handler treats a verified event as no more than a hint to go and ask
// PayPal what actually happened. Never widen the trust placed in this result.
export async function verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const required = [
    "paypal-auth-algo",
    "paypal-cert-url",
    "paypal-transmission-id",
    "paypal-transmission-sig",
    "paypal-transmission-time",
  ];
  for (const h of required) {
    if (!headers.get(h)) return false;
  }

  try {
    const result = await paypalFetch("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    });
    return result?.verification_status === "SUCCESS";
  } catch (err: any) {
    console.error("paypal webhook verification error", err.message);
    return false;
  }
}

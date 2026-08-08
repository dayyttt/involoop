import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";
import { paypalConfigured, paypalSupportsCurrency } from "@/lib/paypal";
import { solanaConfigured, solanaNetwork } from "@/lib/solana";
import { isDemoOwnerEmail } from "@/lib/demo-invoice";

export interface PublicInvoice {
  public_id: string;
  number: string;
  client_name: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  cta_message: string | null;
  due_date: string | null;
  created_at: string;
  paid_at: string | null;
  sender_name: string;
  paypal_enabled: boolean;
  crypto_enabled: boolean;
  /** Which network USDC will settle on, when crypto is offered. */
  crypto_network: "solana-devnet" | "solana-mainnet" | null;
  /** The landing page's exhibit. Every method is shown and none of them work. */
  is_sample: boolean;
}

// Server-side read of a public invoice. Wrapped in React's cache so a single
// request can render the page, its metadata, and its OG image from one query.
//
// Service-role on purpose: RLS blocks anonymous reads, and this page is meant
// to be opened by clients who will never have an account.
export const getPublicInvoice = cache(async (publicId: string): Promise<PublicInvoice | null> => {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "public_id, number, client_name, description, amount, currency, status, due_date, cta_message, created_at, paid_at, owner:profiles(full_name, email, solana_wallet, solana_wallet_verified_at)"
    )
    .eq("public_id", publicId)
    .single();

  if (error || !data) return null;

  const owner = Array.isArray(data.owner) ? data.owner[0] : data.owner;
  const cryptoEnabled =
    solanaConfigured() &&
    data.currency === "USD" &&
    !!owner?.solana_wallet &&
    !!owner?.solana_wallet_verified_at;

  return {
    public_id: data.public_id,
    number: data.number,
    client_name: data.client_name,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    status: data.status,
    cta_message: data.cta_message,
    due_date: data.due_date,
    created_at: data.created_at,
    paid_at: data.paid_at,
    sender_name: owner?.full_name ?? "Freelancer",
    // PayPal cannot settle every currency Involoop bills in — rupiah above all —
    // so the button only appears when this specific invoice could actually be
    // paid with it. Everything else falls to the bank transfer path.
    paypal_enabled: paypalConfigured() && paypalSupportsCurrency(data.currency),
    // Three things must all be true, and none of them are the client's doing:
    // the platform is configured, the invoice is in USD, and the freelancer has
    // proved they control a wallet. If any is false the option simply is not
    // there — a client should never be shown a payment method that cannot work.
    crypto_enabled: cryptoEnabled,
    // The network is not the client's to choose; it is whatever the platform
    // is configured for. Exposing it lets the page say "real money" or "test"
    // truthfully instead of guessing.
    crypto_network: cryptoEnabled
      ? (solanaNetwork() as "solana-devnet" | "solana-mainnet")
      : null,
    // Deliberately not the same as hiding the buttons. Someone deciding whether
    // to sign up needs to see that clients can pay by card, PayPal or USDC —
    // that is most of the pitch. What they must not be able to do is pay.
    is_sample: isDemoOwnerEmail(owner?.email),
  };
});

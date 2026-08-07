import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";
import { paypalConfigured, paypalSupportsCurrency } from "@/lib/paypal";

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
  sender_name: string;
  paypal_enabled: boolean;
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
      "public_id, number, client_name, description, amount, currency, status, due_date, cta_message, created_at, owner:profiles(full_name)"
    )
    .eq("public_id", publicId)
    .single();

  if (error || !data) return null;

  const owner = Array.isArray(data.owner) ? data.owner[0] : data.owner;
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
    sender_name: owner?.full_name ?? "Freelancer",
    // PayPal cannot settle every currency Involoop bills in — rupiah above all —
    // so the button only appears when this specific invoice could actually be
    // paid with it. Everything else falls to the bank transfer path.
    paypal_enabled: paypalConfigured() && paypalSupportsCurrency(data.currency),
  };
});

/**
 * The one account whose invoices are a exhibit, not a bill.
 *
 * The landing page sends strangers to a real, published invoice so they can see
 * the thing before signing up — which is the right demo, and also means the
 * payment buttons on it are pointed at a real freelancer. In sandbox that costs
 * nobody anything. On live PayPal and mainnet USDC, a curious visitor pressing
 * the obvious button would be sending their own money to our demo account.
 *
 * So the sample shows every payment method and honours none of them.
 */
export const DEMO_OWNER_EMAIL = "demo-owner@involoop.app";

export function isDemoOwnerEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === DEMO_OWNER_EMAIL;
}

import { createAdminClient } from "@/lib/supabase-admin";

/**
 * True when this public invoice belongs to the demo account.
 *
 * Checked server-side on every payment entry point, not only in the page that
 * draws the buttons: a disabled button is a suggestion, and the request it would
 * have sent can still be typed by hand.
 */
export async function isSampleInvoice(publicId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("invoices")
    .select("owner:profiles(email)")
    .eq("public_id", publicId)
    .maybeSingle();
  const owner: any = Array.isArray(data?.owner) ? data?.owner[0] : data?.owner;
  return isDemoOwnerEmail(owner?.email);
}

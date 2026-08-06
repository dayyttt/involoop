import Stripe from "stripe";

// Server-only. Returns null when Stripe isn't configured so the app keeps
// working with manual payments only.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

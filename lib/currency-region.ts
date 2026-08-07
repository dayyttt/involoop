import { SUPPORTED_CURRENCIES } from "@/lib/money";

export const CURRENCY_COOKIE = "involoop_cur";

// Country → the currency someone there almost certainly bills in. Only the
// currencies the product actually supports appear here; everywhere else falls
// through to USD, which is the one currency a freelancer anywhere can invoice
// in without explaining themselves.
const BY_COUNTRY: Record<string, string> = {
  ID: "IDR",
  MY: "MYR",
  SG: "SGD",
  TH: "THB",
  PH: "PHP",
  US: "USD",
  GB: "GBP",
  // The euro area. Listed explicitly rather than guessed from the continent,
  // because plenty of European countries do not use the euro.
  AT: "EUR", BE: "EUR", CY: "EUR", DE: "EUR", EE: "EUR", ES: "EUR", FI: "EUR",
  FR: "EUR", GR: "EUR", HR: "EUR", IE: "EUR", IT: "EUR", LT: "EUR", LU: "EUR",
  LV: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SI: "EUR", SK: "EUR",
};

export function currencyForCountry(country?: string | null): string {
  const code = BY_COUNTRY[(country ?? "").toUpperCase()];
  return code && (SUPPORTED_CURRENCIES as readonly string[]).includes(code) ? code : "USD";
}

// Reads the currency the middleware resolved from the visitor's country.
// Returns null rather than a guess, so callers can decide what a missing value
// means for them.
export function currencyFromCookie(cookie: string | undefined | null): string | null {
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${CURRENCY_COOKIE}=([A-Z]{3})`));
  const code = match?.[1];
  return code && (SUPPORTED_CURRENCIES as readonly string[]).includes(code) ? code : null;
}

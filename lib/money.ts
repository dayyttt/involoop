// The single source of truth. This list used to be copied into five files —
// the AI validator, the create route, the manual form's <select>, the prompt
// and here — so adding a currency in one place silently failed in another. A
// Malaysian typing "RM 3000" got an invoice for IDR 3,000 instead of MYR 3,000,
// because the validator did not recognise MYR and quietly fell back to IDR.
export const SUPPORTED_CURRENCIES = [
  "IDR",
  "MYR",
  "SGD",
  "THB",
  "PHP",
  "USD",
  "EUR",
  "GBP",
] as const;

// Shown in the manual form, in this order.
export const CURRENCY_LABELS: Record<string, string> = {
  IDR: "IDR · Rupiah",
  MYR: "MYR · Ringgit Malaysia",
  SGD: "SGD · Singapore Dollar",
  THB: "THB · Thai Baht",
  PHP: "PHP · Philippine Peso",
  USD: "USD · US Dollar",
  EUR: "EUR · Euro",
  GBP: "GBP · British Pound",
};

// Currencies with no minor unit. Getting this wrong is a factor-of-100 error in
// what Stripe charges, so it is a list rather than a single special case.
const ZERO_DECIMAL = new Set(["IDR", "VND", "JPY", "KRW"]);
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupported(c: string): c is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(c);
}

export function currencyDecimals(c: string): number {
  return ZERO_DECIMAL.has(c) ? 0 : 2;
}

export function toMinor(amount: number, c: string): number {
  return Math.round(amount * 10 ** currencyDecimals(c));
}

// amount: invoice.amount (major units) or invoice.amount_minor (minor units).
export function formatMoney(
  amount: number | bigint | string,
  currency: string,
  locale = "en-US",
  minor = false
): string {
  const value = minor ? Number(amount) / 10 ** currencyDecimals(currency) : Number(amount);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString(locale)}`;
  }
}

export function formatDate(date: string, locale = "en-US"): string {
  try {
    return new Date(date).toLocaleDateString(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

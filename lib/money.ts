export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "SGD", "IDR"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupported(c: string): c is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(c);
}

export function currencyDecimals(c: string): number {
  return c === "IDR" ? 0 : 2;
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

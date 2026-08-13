// Common ISO 4217 codes offered as suggestions. Names and symbols are derived at runtime via
// Intl (Intl.DisplayNames / Intl.NumberFormat) rather than hardcoded, so they stay accurate
// and localized instead of drifting from a maintained table.
export const COMMON_CURRENCY_CODES = [
  "USD", "EUR", "GBP", "JPY", "CNY", "INR", "BDT", "PKR", "AUD", "CAD",
  "CHF", "SGD", "HKD", "NZD", "SEK", "NOK", "DKK", "ZAR", "AED", "SAR",
  "THB", "MYR", "IDR", "PHP", "VND", "KRW", "BRL", "MXN", "RUB", "TRY",
  "EGP", "NGN", "KES", "PLN", "CZK", "HUF", "ILS", "QAR", "KWD", "LKR", "NPR",
];

const displayNames = typeof Intl !== "undefined" && "DisplayNames" in Intl
  ? new Intl.DisplayNames(["en"], { type: "currency" })
  : null;

export function getCurrencyName(code: string | undefined | null): string | null {
  if (!code || code.trim().length !== 3) return null;
  try {
    return displayNames?.of(code.trim().toUpperCase()) ?? null;
  } catch {
    return null;
  }
}

export function getCurrencySymbol(code: string | undefined | null): string | null {
  if (!code || code.trim().length !== 3) return null;
  try {
    const part = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code.trim().toUpperCase(),
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part?.value ?? null;
  } catch {
    return null;
  }
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = COMMON_CURRENCY_CODES.map((code) => ({
  code,
  name: getCurrencyName(code) ?? code,
  symbol: getCurrencySymbol(code) ?? code,
}));

export function searchCurrencies(query: string, limit = 8): CurrencyOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return CURRENCY_OPTIONS.slice(0, limit);
  const matches = CURRENCY_OPTIONS.filter(
    (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
  );
  return matches.slice(0, limit);
}

// e.g. "USD ($) · US Dollar" — falls back to the bare code when Intl can't resolve it.
export function formatCurrencyLabel(code: string | undefined | null): string {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  const name = getCurrencyName(upper);
  const symbol = getCurrencySymbol(upper);
  if (!name || !symbol || symbol === upper) return upper;
  return `${upper} (${symbol}) · ${name}`;
}

// e.g. "USD ($)" — compact form for table cells; pair with formatCurrencyLabel() as a title/tooltip.
export function formatCurrencyShort(code: string | undefined | null): string {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  const symbol = getCurrencySymbol(upper);
  if (!symbol || symbol === upper) return upper;
  return `${upper} (${symbol})`;
}

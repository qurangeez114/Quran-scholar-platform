/**
 * Product configuration. Brand identity is undecided — change the name here only.
 * Business logic must never reference the product name directly.
 */
export const APP_CONFIG = {
  name: (import.meta.env.VITE_APP_NAME as string | undefined) ?? "Global Equb",
  shortName: "Equb",
  tagline: "Coordinate your Equb circle with clarity.",
  // Candidate names under consideration (not used in UI)
  candidateNames: ["HIMBERTI"],
  defaultCurrency: "USD",
  defaultLanguage: "en",
} as const;

export const CURRENCIES: { code: string; label: string }[] = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "ETB", label: "Ethiopian Birr" },
  { code: "ERN", label: "Eritrean Nakfa" },
  { code: "AED", label: "UAE Dirham" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "ILS", label: "Israeli Shekel" },
  { code: "KES", label: "Kenyan Shilling" },
  { code: "UGX", label: "Ugandan Shilling" },
  { code: "ZAR", label: "South African Rand" },
];

/** Languages: only English UI is shipped; others are selectable preferences for future translation. */
export const LANGUAGES: { code: string; label: string; available: boolean }[] = [
  { code: "en", label: "English", available: true },
  { code: "ti", label: "ትግርኛ (Tigrinya)", available: false },
  { code: "am", label: "አማርኛ (Amharic)", available: false },
  { code: "ar", label: "العربية (Arabic)", available: false },
  { code: "fr", label: "Français", available: false },
  { code: "it", label: "Italiano", available: false },
  { code: "de", label: "Deutsch", available: false },
  { code: "sv", label: "Svenska", available: false },
  { code: "nl", label: "Nederlands", available: false },
];

export const DISCLAIMER =
  "This app records and coordinates. It does not hold, move, or transmit money. All amounts are records entered by group members.";

/**
 * Platform/admin fees. OFF for the MVP: any fee model (including a flat per-contribution
 * or a payout percentage) is pending licensed legal and qualified Sharia scholar review.
 * If ever enabled, fees must be flat, itemized and disclosed up front — never tied to
 * time overdue, loan size, payout size or earlier access.
 */
export const FEES = { enabled: false, statusLabel: "No fees. Platform fees are disabled pending legal and scholarly review." } as const;

/** Ethical statement. Intentionally makes NO "Sharia-compliant", "halal certified" or "scholar approved" claim. */
export const ETHICS_STATEMENT =
  "Interest-free by design. Every member contributes the same agreed amount and receives the same pooled amount once, in an order written into the circle's terms. There is no interest, no profit or return, no bidding for earlier turns and no lottery. This is financial recordkeeping only; no funds are held or transferred.";
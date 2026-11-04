// Pure Equb domain helpers (no I/O) — shared by dashboard and group pages.

export type Periodicity = "weekly" | "biweekly" | "monthly";
export type PayoutMethod = "manual" | "rotating" | "random";

export interface ContributionLike {
  amount: number | string;
  payer_id: string;
  round_id: string;
  payer_confirmed_at: string | null;
  organizer_confirmed_at: string | null;
}
export interface RoundLike {
  id: string;
  round_number: number;
  due_date: string; // YYYY-MM-DD in group timezone
  recipient_id: string | null;
  payout_recorded_at: string | null;
  recipient_confirmed_at: string | null;
}

export type ContributionStatus = "missing" | "recorded" | "payer_confirmed" | "organizer_confirmed" | "confirmed";

export function contributionStatus(c: ContributionLike | undefined | null): ContributionStatus {
  if (!c) return "missing";
  if (c.payer_confirmed_at && c.organizer_confirmed_at) return "confirmed";
  if (c.organizer_confirmed_at) return "organizer_confirmed";
  if (c.payer_confirmed_at) return "payer_confirmed";
  return "recorded";
}

export const CONTRIBUTION_LABEL: Record<ContributionStatus, string> = {
  missing: "Not recorded",
  recorded: "Recorded · not verified",
  payer_confirmed: "Payer confirmed · awaiting organizer",
  organizer_confirmed: "Organizer confirmed · awaiting payer",
  confirmed: "Confirmed by both",
};

export type PayoutStatus = "planned" | "recorded" | "confirmed";
export function payoutStatus(r: RoundLike): PayoutStatus {
  if (r.payout_recorded_at && r.recipient_confirmed_at) return "confirmed";
  if (r.payout_recorded_at) return "recorded";
  return "planned";
}
export const PAYOUT_LABEL: Record<PayoutStatus, string> = {
  planned: "Planned",
  recorded: "Marked paid outside app · awaiting recipient",
  confirmed: "Confirmed by organizer & recipient",
};

/** Payout methods organizers can pick today. Random draw stays off pending scholar/legal review. */
export const AVAILABLE_PAYOUT_METHODS: PayoutMethod[] = ["rotating", "manual"];

/**
 * The pot a recipient receives: exactly contribution × members. No interest, no
 * time-based growth, no fees deducted, no discount or markup for earlier/later turns.
 */
export function payoutAmount(contributionAmount: number | string, members: number): number {
  return round2(toNumber(contributionAmount) * members);
}

export const PERIOD_LABEL: Record<Periodicity, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

export const PAYOUT_METHOD_RULES: Record<PayoutMethod, { label: string; rule: string }> = {
  rotating: {
    label: "Rotating (join order)",
    rule: "Members receive the pot in the order they joined. The organizer is first unless the order is changed before any contributions are recorded.",
  },
  random: {
    label: "Random draw (not available — pending review)",
    rule: "Not available. Random allocation is switched off until it has been reviewed by qualified scholars and legal advisers to confirm it involves no wagering or unequal benefit.",
  },
  manual: {
    label: "Manual (organizer sets order)",
    rule: "The organizer sets the payout order, which all members can see. The order is locked once any contribution is recorded.",
  },
};

/** Today's calendar date (YYYY-MM-DD) in an IANA timezone. */
export function todayInTimeZone(tz: string, now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return parts; // en-CA => YYYY-MM-DD
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export function isOverdue(dueDate: string, today: string): boolean {
  return dueDate < today;
}

export function toNumber(v: number | string): number {
  return typeof v === "number" ? v : Number.parseFloat(v);
}

export interface RoundTotals {
  expected: number;
  recorded: number;
  confirmed: number;
  missingCount: number;
  unconfirmedCount: number;
}

/** Totals for one round. Expected = contribution × members; "confirmed" counts only two-party confirmed records. */
export function roundTotals(
  round: Pick<RoundLike, "id">,
  memberIds: string[],
  contributionAmount: number,
  contributions: ContributionLike[],
): RoundTotals {
  const inRound = contributions.filter((c) => c.round_id === round.id);
  let recorded = 0;
  let confirmed = 0;
  let unconfirmedCount = 0;
  for (const c of inRound) {
    const amt = toNumber(c.amount);
    recorded += amt;
    if (contributionStatus(c) === "confirmed") confirmed += amt;
    else unconfirmedCount++;
  }
  const payers = new Set(inRound.map((c) => c.payer_id));
  const missingCount = memberIds.filter((m) => !payers.has(m)).length;
  return {
    expected: round2(contributionAmount * memberIds.length),
    recorded: round2(recorded),
    confirmed: round2(confirmed),
    missingCount,
    unconfirmedCount,
  };
}

/** The first round whose due date is today or later; falls back to the first unpaid round. */
export function currentRound<T extends RoundLike>(rounds: T[], today: string): T | undefined {
  const sorted = [...rounds].sort((a, b) => a.round_number - b.round_number);
  return sorted.find((r) => r.due_date >= today) ?? sorted.find((r) => payoutStatus(r) !== "confirmed");
}

/** Sum of the user's own contribution shortfall for rounds that are due (today or earlier). */
export function outstandingForUser(
  userId: string,
  rounds: RoundLike[],
  contributions: ContributionLike[],
  contributionAmount: number,
  today: string,
): number {
  let owed = 0;
  for (const r of rounds) {
    if (r.due_date > today) continue;
    const mine = contributions.filter((c) => c.round_id === r.id && c.payer_id === userId);
    const paid = mine.reduce((s, c) => s + toNumber(c.amount), 0);
    owed += Math.max(0, contributionAmount - paid);
  }
  return round2(owed);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatMoney(amount: number | string, currency: string) {
  const n = toNumber(amount);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function formatDate(d: string) {
  // d is a calendar date; render without timezone shift
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString(undefined, {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Preview round dates client-side (mirrors server generate_schedule). */
export function previewDueDates(start: string, periodicity: Periodicity, count: number): string[] {
  const [y, m, d] = start.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let dt: Date;
    if (periodicity === "monthly") {
      const target = new Date(Date.UTC(y, m - 1 + i, 1));
      const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
      dt = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, lastDay)));
    } else {
      dt = new Date(Date.UTC(y, m - 1, d + i * (periodicity === "weekly" ? 7 : 14)));
    }
    out.push(dt.toISOString().slice(0, 10));
  }
  return out;
}
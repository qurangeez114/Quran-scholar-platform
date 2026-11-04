import { describe, expect, it } from "vitest";
import {
  contributionStatus,
  outstandingForUser,
  previewDueDates,
  roundTotals,
  todayInTimeZone,
} from "@/lib/equb";

const c = (o: Partial<Parameters<typeof contributionStatus>[0] & object> = {}) => ({
  amount: 100,
  payer_id: "a",
  round_id: "r1",
  payer_confirmed_at: null,
  organizer_confirmed_at: null,
  ...o,
});

describe("equb rules", () => {
  it("a record is only 'confirmed' when both payer and organizer confirmed", () => {
    expect(contributionStatus(c())).toBe("recorded");
    expect(contributionStatus(c({ payer_confirmed_at: "x" }))).toBe("payer_confirmed");
    expect(contributionStatus(c({ organizer_confirmed_at: "x" }))).toBe("organizer_confirmed");
    expect(contributionStatus(c({ payer_confirmed_at: "x", organizer_confirmed_at: "y" }))).toBe("confirmed");
  });

  it("round totals count only two-party confirmed amounts as confirmed", () => {
    const t = roundTotals({ id: "r1" }, ["a", "b", "c"], 100, [
      c({ payer_id: "a", payer_confirmed_at: "x", organizer_confirmed_at: "y" }),
      c({ payer_id: "b" }),
    ]);
    expect(t).toEqual({ expected: 300, recorded: 200, confirmed: 100, missingCount: 1, unconfirmedCount: 1 });
  });

  it("outstanding only counts rounds due today or earlier", () => {
    const rounds = [
      { id: "r1", round_number: 1, due_date: "2026-01-01", recipient_id: null, payout_recorded_at: null, recipient_confirmed_at: null },
      { id: "r2", round_number: 2, due_date: "2026-02-01", recipient_id: null, payout_recorded_at: null, recipient_confirmed_at: null },
      { id: "r3", round_number: 3, due_date: "2026-03-01", recipient_id: null, payout_recorded_at: null, recipient_confirmed_at: null },
    ];
    expect(outstandingForUser("a", rounds, [c({ round_id: "r1" })], 100, "2026-02-01")).toBe(100);
  });

  it("monthly schedule clamps to the last day of short months", () => {
    expect(previewDueDates("2026-01-31", "monthly", 3)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(previewDueDates("2026-01-01", "biweekly", 2)).toEqual(["2026-01-01", "2026-01-15"]);
  });

  it("today is computed in the group's timezone", () => {
    const now = new Date("2026-05-01T23:30:00Z");
    expect(todayInTimeZone("UTC", now)).toBe("2026-05-01");
    expect(todayInTimeZone("Africa/Addis_Ababa", now)).toBe("2026-05-02");
  });
});

import { AVAILABLE_PAYOUT_METHODS, payoutAmount } from "@/lib/equb";
import { FEES } from "@/config/app";

describe("interest-free rules", () => {
  it("payout is exactly contribution × members, with no growth or deduction", () => {
    expect(payoutAmount(100, 10)).toBe(1000);
    expect(payoutAmount("25.5", 4)).toBe(102);
  });
  it("random draw is not offered to organizers", () => {
    expect(AVAILABLE_PAYOUT_METHODS).toEqual(["rotating", "manual"]);
  });
  it("platform fees are disabled for the MVP", () => {
    expect(FEES.enabled).toBe(false);
  });
});
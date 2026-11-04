import { describe, expect, it } from "vitest";
import { canRequestTermination, canConsentTermination, completionReady } from "@/lib/lifecycle";

describe("Equb lifecycle UI safeguards", () => {
  it("only lets an organizer request early termination of active circle once", () => {
    expect(canRequestTermination({ status: "active", isOrganizer: true, alreadyRequested: false })).toBe(true);
    expect(canRequestTermination({ status: "active", isOrganizer: false, alreadyRequested: false })).toBe(false);
    expect(canRequestTermination({ status: "active", isOrganizer: true, alreadyRequested: true })).toBe(false);
    expect(canRequestTermination({ status: "terminated", isOrganizer: true, alreadyRequested: false })).toBe(false);
  });
  it("requires pending request and not-yet-given consent", () => {
    const x = { status: "active", pending: true, viewerId: "member", alreadyConsented: false };
    expect(canConsentTermination(x)).toBe(true);
    expect(canConsentTermination({ ...x, alreadyConsented: true })).toBe(false);
    expect(canConsentTermination({ ...x, pending: false })).toBe(false);
    expect(canConsentTermination({ ...x, status: "completed" })).toBe(false);
  });
  const ready = { status: "active", members: 5, rounds: 5, paidRoundCount: 5,
    confirmedContributionCount: 25, disputesOpen: 0, missedOpen: 0, terminationPending: false };
  it("requires all five rounds and 25 independently confirmed contributions", () => {
    expect(completionReady(ready)).toBe(true);
    expect(completionReady({ ...ready, paidRoundCount: 4 })).toBe(false);
    expect(completionReady({ ...ready, confirmedContributionCount: 24 })).toBe(false);
  });
  it("does not complete with disputes, missed records or unknown counts", () => {
    expect(completionReady({ ...ready, disputesOpen: 1 })).toBe(false);
    expect(completionReady({ ...ready, missedOpen: 1 })).toBe(false);
    expect(completionReady({ ...ready, disputesOpen: null })).toBe(false);
    expect(completionReady({ ...ready, missedOpen: null })).toBe(false);
  });
  it("disallows completion in inactive/terminated circles or pending termination", () => {
    expect(completionReady({ ...ready, status: "terminated" })).toBe(false);
    expect(completionReady({ ...ready, status: "forming" })).toBe(false);
    expect(completionReady({ ...ready, terminationPending: true })).toBe(false);
  });
  it("requires valid participant and round counts", () => {
    expect(completionReady({ ...ready, members: 1 })).toBe(false);
    expect(completionReady({ ...ready, rounds: 4 })).toBe(false);
  });
});

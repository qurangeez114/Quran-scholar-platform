import { describe, expect, it } from "vitest";
import { canOpenDispute, canResolveDispute } from "@/lib/disputes";

const base = {
  payerId: "payer", recipientId: "recipient", viewerId: "outsider",
  viewerIsOrganizer: false, payoutRecorded: false, hasOpenDispute: false,
};
describe("Equb dispute UI restrictions", () => {
  it("allows a payer, recipient, or organizer to initiate a dispute", () => {
    expect(canOpenDispute({ ...base, viewerId: "payer" })).toBe(true);
    expect(canOpenDispute({ ...base, viewerId: "recipient" })).toBe(true);
    expect(canOpenDispute({ ...base, viewerIsOrganizer: true })).toBe(true);
  });
  it("prevents an uninvolved member from opening a dispute", () => {
    expect(canOpenDispute(base)).toBe(false);
  });
  it("does not initiate disputes after payout or duplicate open disputes", () => {
    expect(canOpenDispute({ ...base, viewerId: "payer", payoutRecorded: true })).toBe(false);
    expect(canOpenDispute({ ...base, viewerId: "payer", hasOpenDispute: true })).toBe(false);
  });
  const resolver = {
    viewerId: "reviewer", openedBy: "complainant", payerId: "payer",
    organizer: false, optedIn: false, status: "open",
  };
  it("permits a different consented verifier or organizer to resolve", () => {
    expect(canResolveDispute({ ...resolver, optedIn: true })).toBe(true);
    expect(canResolveDispute({ ...resolver, organizer: true })).toBe(true);
  });
  it("prevents opener and payer from resolving regardless of their role", () => {
    expect(canResolveDispute({ ...resolver, viewerId: "payer", organizer: true })).toBe(false);
    expect(canResolveDispute({ ...resolver, viewerId: "complainant", organizer: true })).toBe(false);
  });
  it("disallows unconsented verifiers and closed disputes", () => {
    expect(canResolveDispute(resolver)).toBe(false);
    for (const status of ["resolved", "withdrawn"]) {
      expect(canResolveDispute({ ...resolver, optedIn: true, status })).toBe(false);
    }
  });
});

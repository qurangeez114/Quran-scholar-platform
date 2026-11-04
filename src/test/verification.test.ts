import { describe, expect, it } from "vitest";
import { confirmationAction } from "@/lib/verification";

const base = {
  groupStatus: "active",
  payerId: "person-a",
  viewerId: "person-b",
  payerConfirmedAt: null,
  verifierConfirmedAt: null,
  viewerIsOrganizer: false,
  viewerConsentedToVerify: false,
};

describe("Equb payment verification UI permissions", () => {
  it("lets payer confirm their own contribution once", () => {
    expect(confirmationAction({ ...base, viewerId: "person-a" })).toBe("payer");
    expect(confirmationAction({ ...base, viewerId: "person-a", payerConfirmedAt: "2026-11-04T20:00:00Z" })).toBe(null);
  });
  it("never lets payer also verify it, even as organizer", () => {
    expect(confirmationAction({ ...base, viewerId: "person-a", viewerIsOrganizer: true, payerConfirmedAt: "2026-11-04T20:00:00Z" })).toBe(null);
  });
  it("allows another organizer to verify", () => {
    expect(confirmationAction({ ...base, viewerIsOrganizer: true })).toBe("verifier");
  });
  it("requires non-organizer's explicit verifier consent", () => {
    expect(confirmationAction(base)).toBe(null);
    expect(confirmationAction({ ...base, viewerConsentedToVerify: true })).toBe("verifier");
  });
  it("does not permit repeated independent verification", () => {
    expect(confirmationAction({ ...base, viewerConsentedToVerify: true, verifierConfirmedAt: "2026-11-04T20:01:00Z" })).toBe(null);
  });
  it("disallows verification outside active circles", () => {
    for (const groupStatus of ["forming", "completed", "terminated"]) {
      expect(confirmationAction({ ...base, groupStatus, viewerIsOrganizer: true })).toBe(null);
    }
  });
});

/**
 * UI affordances only. SECURITY DEFINER RPCs are the source of truth.
 * Keep in sync with db-review migration 0004 and rerun staging RLS tests.
 */
export type ConfirmationAction = "payer" | "verifier" | null;

export function confirmationAction(input: {
  groupStatus: string;
  payerId: string;
  viewerId: string;
  payerConfirmedAt: string | null;
  verifierConfirmedAt: string | null;
  viewerIsOrganizer: boolean;
  viewerConsentedToVerify: boolean;
}): ConfirmationAction {
  if (input.groupStatus !== "active") return null;
  if (input.payerId === input.viewerId) {
    return input.payerConfirmedAt ? null : "payer";
  }
  if (!input.viewerIsOrganizer && !input.viewerConsentedToVerify) return null;
  return input.verifierConfirmedAt ? null : "verifier";
}

/** UI-only checks. PostgreSQL RPCs enforce all permissions independently. */
export function canOpenDispute(input: {
  payerId: string; recipientId: string | null; viewerId: string;
  viewerIsOrganizer: boolean; payoutRecorded: boolean; hasOpenDispute: boolean;
}): boolean {
  return !input.payoutRecorded && !input.hasOpenDispute &&
    (input.viewerId === input.payerId || input.viewerId === input.recipientId || input.viewerIsOrganizer);
}

export function canResolveDispute(input: {
  viewerId: string; openedBy: string; payerId: string;
  organizer: boolean; optedIn: boolean; status: string;
}): boolean {
  return input.status === "open" && input.viewerId !== input.openedBy &&
    input.viewerId !== input.payerId && (input.organizer || input.optedIn);
}

/**
 * UI affordances only. Lifecycle RPCs perform authoritative server-side checks.
 * Counts for misses/disputes must be loaded before enabling completion.
 */
export function canRequestTermination(input: {
  status: string; isOrganizer: boolean; alreadyRequested: boolean;
}): boolean {
  return input.status === "active" && input.isOrganizer && !input.alreadyRequested;
}

export function canConsentTermination(input: {
  status: string; pending: boolean; viewerId: string; alreadyConsented: boolean;
}): boolean {
  return input.status === "active" && input.pending && Boolean(input.viewerId) && !input.alreadyConsented;
}

export function completionReady(input: {
  status: string; members: number; rounds: number;
  paidRoundCount: number; confirmedContributionCount: number;
  disputesOpen: number | null; missedOpen: number | null; terminationPending: boolean;
}): boolean {
  return input.status === "active" &&
    input.members >= 2 && input.rounds === input.members &&
    input.paidRoundCount === input.rounds &&
    input.confirmedContributionCount === input.rounds * input.members &&
    input.disputesOpen === 0 && input.missedOpen === 0 && !input.terminationPending;
}

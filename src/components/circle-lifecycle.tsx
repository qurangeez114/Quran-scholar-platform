import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, ErrorBox } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Notice, Pill } from "@/components/status";
import { formatMoney } from "@/lib/equb";
import { canRequestTermination, canConsentTermination, completionReady } from "@/lib/lifecycle";

type Termination = {
  group_id: string; requested_by: string; reason: string;
  requested_at: string; effective_at: string | null;
};
type TerminationConsent = { group_id: string; user_id: string; consented_at: string };
type Reconciliation = {
  user_id: string; display_name: string; contributions_expected: number | string;
  contributions_confirmed: number | string; payout_expected: number | string;
  payout_confirmed: number | string; net_position: number | string;
};

// These tables and RPCs are introduced by review migration 0004. Until the
// migration is staged and generated Supabase types are updated, this adapter
// is intentionally isolated here. It is NOT a replacement for schema typing.
const stagingApi = supabase as unknown as {
  from: (name: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => PromiseLike<{
        data: unknown[] | null; error: { message: string } | null;
      }>;
    };
  };
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{
    data: unknown; error: { message: string } | null;
  }>;
};

export function CircleLifecycle({
  groupId, uid, status, isOrganizer, members, rounds, contributions,
  currency,
}: {
  groupId: string; uid: string; status: string; isOrganizer: boolean;
  members: { user_id: string }[];
  rounds: { payout_recorded_at: string | null; recipient_confirmed_at: string | null }[];
  contributions: { payer_confirmed_at: string | null; organizer_confirmed_at: string | null }[];
  currency: string;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const terminationQuery = useQuery({
    queryKey: ["equb-termination", groupId],
    queryFn: async () => {
      const { data, error } = await stagingApi.from("group_terminations")
        .select("*").eq("group_id", groupId);
      if (error) throw new Error(error.message);
      return (data ?? [])[0] as Termination | undefined;
    },
  });
  const consentsQuery = useQuery({
    queryKey: ["equb-termination-consents", groupId],
    queryFn: async () => {
      const { data, error } = await stagingApi.from("termination_consents")
        .select("*").eq("group_id", groupId);
      if (error) throw new Error(error.message);
      return (data ?? []) as TerminationConsent[];
    },
  });
  const reconciliationQuery = useQuery({
    queryKey: ["equb-reconciliation", groupId],
    queryFn: async () => {
      const { data, error } = await stagingApi.rpc("circle_reconciliation", { _group: groupId });
      if (error) throw new Error(error.message);
      return (data ?? []) as Reconciliation[];
    },
  });

  const disputesQuery = useQuery({
    queryKey: ["equb-disputes", groupId],
    queryFn: async () => {
      const r = await stagingApi.from("disputes").select("*").eq("group_id", groupId);
      if (r.error) throw new Error(r.error.message);
      return (r.data ?? []) as { status: string }[];
    },
  });
  const missedQuery = useQuery({
    queryKey: ["equb-missed", groupId],
    queryFn: async () => {
      const r = await stagingApi.from("missed_contributions").select("*").eq("group_id", groupId);
      if (r.error) throw new Error(r.error.message);
      return (r.data ?? []) as { status: string }[];
    },
  });
  const disputesOpen = disputesQuery.data ? disputesQuery.data.filter(d => d.status === "open").length : null;
  const missedOpen = missedQuery.data ? missedQuery.data.filter(d => d.status === "open").length : null;
  const termination = terminationQuery.data;
  const consentIds = new Set(consentsQuery.data?.map(x => x.user_id) ?? []);
  const pending = Boolean(termination && !termination.effective_at && status === "active");
  const ready = completionReady({
    status, members: members.length, rounds: rounds.length,
    paidRoundCount: rounds.filter(r => r.payout_recorded_at && r.recipient_confirmed_at).length,
    confirmedContributionCount: contributions.filter(c => c.payer_confirmed_at && c.organizer_confirmed_at).length,
    disputesOpen, missedOpen, terminationPending: pending || Boolean(terminationQuery.error),
  });

  async function execute(name: string, args: Record<string, unknown>, message: string) {
    if (busy) return false;
    setBusy(true);
    try {
      const { error } = await stagingApi.rpc(name, args);
      if (error) throw new Error(error.message);
      toast.success(message);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["group", groupId] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["equb-termination", groupId] }),
        qc.invalidateQueries({ queryKey: ["equb-termination-consents", groupId] }),
        qc.invalidateQueries({ queryKey: ["equb-reconciliation", groupId] }),
      ]);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return <section className="space-y-4">
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold">Early circle termination</h2>
        {status === "terminated" ? <Pill tone="danger">Terminated</Pill>
          : pending ? <Pill tone="pending">Awaiting unanimous consent</Pill>
          : <Pill tone="neutral">No pending termination</Pill>}
      </div>
      <Notice tone="warning">
        Early termination stops future recording and scheduling but does not
        reverse payments already made outside the app. Members should reconcile
        existing obligations and obtain appropriate advice before agreeing.
      </Notice>
      {terminationQuery.error || consentsQuery.error ? <ErrorBox
        error={terminationQuery.error ?? consentsQuery.error}
        onRetry={() => { void terminationQuery.refetch(); void consentsQuery.refetch(); }}
      /> : terminationQuery.isLoading || consentsQuery.isLoading
        ? <p className="text-sm text-muted-foreground">Checking termination status…</p> : <>
          {termination && <div className="space-y-2 text-sm">
            <p className="whitespace-pre-wrap"><strong>Reason:</strong> {termination.reason}</p>
            <p className="text-muted-foreground">Requested {new Date(termination.requested_at).toLocaleString()}</p>
            <p>{consentIds.size} of {members.length} members have consented.</p>
          </div>}
          {canRequestTermination({ status, isOrganizer, alreadyRequested: Boolean(termination) }) && <>
            <Button variant="outline" disabled={busy} onClick={() => setShowRequest(!showRequest)}>
              {showRequest ? "Close request" : "Request early termination"}
            </Button>
            {showRequest && <div className="space-y-2">
              <label htmlFor="termination-reason" className="text-sm font-medium">Reason for proposed termination</label>
              <Textarea id="termination-reason" value={reason} onChange={e => setReason(e.target.value)}
                maxLength={2000} placeholder="Explain why ending this circle early is proposed…" />
              <Button variant="destructive" disabled={busy || reason.trim().length < 10}
                onClick={() => {
                  if (window.confirm("Request early termination? All members must explicitly consent.")) {
                    void execute("request_termination", { _group: groupId, _reason: reason.trim() },
                      "Termination requested; awaiting unanimous consent").then(ok => { if (ok) { setShowRequest(false); setReason(""); } });
                  }
                }}>
                Submit termination request
              </Button>
            </div>}
          </>}
          {canConsentTermination({ status, pending, viewerId: uid, alreadyConsented: consentIds.has(uid) }) &&
            <Button variant="destructive" disabled={busy} onClick={() => {
              if (window.confirm("Consent to end this circle early? This cannot reverse external payments.")) {
                void execute("consent_termination", { _group: groupId },
                  "Your consent was recorded");
              }
            }}>Consent to early termination</Button>}
          {pending && consentIds.has(uid) &&
            <p className="text-sm text-muted-foreground">You have already consented. Other members must consent before termination becomes effective.</p>}
          {status === "terminated" && <p className="text-sm">This circle is terminated; new contributions, payouts and schedules are blocked.</p>}
        </>}
    </Card>

    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-semibold">Financial reconciliation and completion</h2>
        <Pill tone={status === "completed" ? "success" : "neutral"}>
          {status === "completed" ? "Completed" : "Review only"}
        </Pill>
      </div>
      <p className="text-sm text-muted-foreground">
        This is an accounting of reported off-platform transactions, not proof that banks
        or payment providers transferred the stated amounts.
      </p>
      {reconciliationQuery.error ? <ErrorBox error={reconciliationQuery.error} onRetry={() => reconciliationQuery.refetch()} />
        : reconciliationQuery.isLoading ? <p className="text-sm text-muted-foreground">Calculating reconciliation…</p>
        : <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 pr-3">Member</th>
              <th className="py-2 pr-3">Confirmed contributions</th>
              <th className="py-2 pr-3">Acknowledged payouts</th>
              <th className="py-2">Net position</th>
            </tr></thead>
            <tbody>{(reconciliationQuery.data ?? []).map(row => <tr key={row.user_id} className="border-b">
              <td className="py-3 pr-3">{row.display_name}</td>
              <td className="py-3 pr-3">{formatMoney(row.contributions_confirmed, currency)}
                <p className="text-xs text-muted-foreground">of {formatMoney(row.contributions_expected, currency)} expected</p></td>
              <td className="py-3 pr-3">{formatMoney(row.payout_confirmed, currency)}
                <p className="text-xs text-muted-foreground">of {formatMoney(row.payout_expected, currency)} expected</p></td>
              <td className="py-3">{formatMoney(row.net_position, currency)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      {(missedQuery.error || disputesQuery.error) && <Notice tone="warning">Payment exceptions could not be checked. Completion is disabled until they can be verified.</Notice>}
      {!ready && status === "active" && <p className="text-xs text-muted-foreground">
        Completion requires every round paid and acknowledged, every contribution independently
        verified, no open payment exceptions, and no pending termination.
      </p>}
      {isOrganizer && status === "active" && <Button disabled={busy || !ready}
        onClick={() => {
          if (window.confirm("Finalize this circle? Confirm all external payouts are acknowledged and no disputes remain.")) {
            void execute("complete_circle", { _group: groupId }, "Circle completion recorded");
          }
        }}>Complete circle</Button>}
      {status === "completed" && <Notice>Circle completion has been recorded in the Equb audit log. Reconciliation data remains available for review.</Notice>}
    </Card>
  </section>;
}

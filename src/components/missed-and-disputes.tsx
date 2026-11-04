import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, ErrorBox } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Notice, Pill } from "@/components/status";
import { supabase } from "@/integrations/supabase/client";
import { canOpenDispute, canResolveDispute } from "@/lib/disputes";

type Missed = {
  id: string; group_id: string; round_id: string; payer_id: string;
  round_number: number; due_date: string; status: "open" | "resolved";
};
type Dispute = {
  id: string; group_id: string; round_id: string; contribution_id: string;
  opened_by: string; reason: string; status: "open" | "resolved" | "withdrawn";
  resolution: string | null; resolved_by: string | null; opened_at: string;
};
type Event = {
  id: string; dispute_id: string; actor_id: string; kind: string;
  body: string | null; created_at: string;
};
type Contribution = { id: string; round_id: string; payer_id: string };
type Round = { id: string; round_number: number; recipient_id: string | null; payout_recorded_at: string | null };

/**
 * Staging-only until 0004 is deployed and generated Supabase types refreshed.
 * The typed adapter is intentionally local; it must not be shipped in production.
 */
const stage = supabase as unknown as {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (col: string, value: string) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export function MissedAndDisputes({
  groupId, uid, isOrganizer, optedInVerifier, status, contributions, rounds,
  memberName,
}: {
  groupId: string; uid: string; isOrganizer: boolean; optedInVerifier: boolean;
  status: string; contributions: Contribution[]; rounds: Round[];
  memberName: (id: string | null) => string;
}) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [draftFor, setDraftFor] = useState<string | null>(null);
  const [draftReason, setDraftReason] = useState("");
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [draftResolution, setDraftResolution] = useState<Record<string, string>>({});
  const [showEvents, setShowEvents] = useState<string | null>(null);

  const missedQuery = useQuery({
    queryKey: ["equb-missed", groupId],
    queryFn: async () => {
      const r = await stage.from("missed_contributions").select("*").eq("group_id", groupId);
      if (r.error) throw new Error(r.error.message);
      return (r.data ?? []) as Missed[];
    },
  });
  const disputeQuery = useQuery({
    queryKey: ["equb-disputes", groupId],
    queryFn: async () => {
      const r = await stage.from("disputes").select("*").eq("group_id", groupId);
      if (r.error) throw new Error(r.error.message);
      return ((r.data ?? []) as Dispute[]).sort((a, b) => b.opened_at.localeCompare(a.opened_at));
    },
  });
  const eventsQuery = useQuery({
    queryKey: ["equb-dispute-events", groupId],
    enabled: showEvents !== null,
    queryFn: async () => {
      const r = await stage.from("dispute_events").select("*").eq("dispute_id", showEvents!);
      if (r.error) throw new Error(r.error.message);
      return ((r.data ?? []) as Event[]).sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
  });
  const openByContribution = useMemo(
    () => new Set(disputeQuery.data?.filter(d => d.status === "open").map(d => d.contribution_id) ?? []),
    [disputeQuery.data],
  );
  const roundById = new Map(rounds.map(r => [r.id, r]));
  const contributionById = new Map(contributions.map(c => [c.id, c]));
  const missed = missedQuery.data?.filter(m => m.status === "open") ?? [];

  async function perform(message: string, name: string, args: Record<string, unknown>, after?: () => void) {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await stage.rpc(name, args);
      if (error) throw new Error(error.message);
      toast.success(message);
      after?.();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["equb-missed", groupId] }),
        qc.invalidateQueries({ queryKey: ["equb-disputes", groupId] }),
        qc.invalidateQueries({ queryKey: ["equb-dispute-events", groupId] }),
        qc.invalidateQueries({ queryKey: ["group", groupId] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (missedQuery.error || disputeQuery.error) return <Card>
    <h2 className="font-semibold">Payment exceptions unavailable</h2>
    <p className="mt-2 text-sm text-muted-foreground">
      The lifecycle migration must be installed on staging before this screen can load.
    </p>
    <ErrorBox error={missedQuery.error ?? disputeQuery.error} onRetry={() => {
      void missedQuery.refetch();
      void disputeQuery.refetch();
    }} />
  </Card>;

  return <section className="space-y-4">
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Overdue contributions</h2>
        <Button variant="outline" size="sm" disabled={busy || status !== "active"}
          onClick={() => void perform("Missed contributions refreshed", "refresh_missed_contributions", { _group: groupId })}>
          Refresh overdue status
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        A payment is overdue after its due date in the circle's timezone until both required confirmations are recorded.
      </p>
      {missedQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading overdue records…</p> :
        missed.length === 0 ? <p className="text-sm text-muted-foreground">No outstanding missed contributions have been detected.</p> :
        <ul className="space-y-2 text-sm">{missed.map(m => <li key={m.id} className="rounded-lg border p-3">
          <span className="font-medium">{memberName(m.payer_id)}</span> · round {m.round_number}
          <span className="ml-2 text-muted-foreground">due {m.due_date}</span>
          <Pill tone="pending">Unverified</Pill>
        </li>)}</ul>}
    </Card>

    <Card className="space-y-4">
      <h2 className="font-semibold">Payment disputes</h2>
      <Notice tone="warning">An open dispute prevents that round's payout. Resolving a dispute does not change the recorded payment; disputed nonreceipt requires a separate correction process.</Notice>
      {disputeQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading disputes…</p> :
        !disputeQuery.data?.length ? <p className="text-sm text-muted-foreground">No disputes have been opened.</p> :
        <div className="space-y-3">{disputeQuery.data.map(d => {
          const c = contributionById.get(d.contribution_id);
          const r = roundById.get(d.round_id);
          const canResolve = c && canResolveDispute({
            viewerId: uid, openedBy: d.opened_by, payerId: c.payer_id,
            organizer: isOrganizer, optedIn: optedInVerifier, status: d.status,
          });
          return <div key={d.id} className="rounded-xl border p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <strong>Round {r?.round_number ?? "?"} · {c ? memberName(c.payer_id) : "Contribution"}</strong>
              <Pill tone={d.status === "open" ? "danger" : "neutral"}>{d.status}</Pill>
            </div>
            <p className="mt-2 whitespace-pre-wrap">{d.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground">Opened by {memberName(d.opened_by)} · {new Date(d.opened_at).toLocaleString()}</p>
            {d.resolution && <p className="mt-2 rounded-lg bg-muted p-2"><strong>Resolution:</strong> {d.resolution}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                setShowEvents(showEvents === d.id ? null : d.id);
              }}>{showEvents === d.id ? "Hide history" : "View history"}</Button>
              {d.status === "open" && d.opened_by === uid &&
                <Button size="sm" variant="outline" disabled={busy}
                  onClick={() => { if (window.confirm("Withdraw your dispute?")) void perform("Dispute withdrawn", "withdraw_dispute", { _dispute: d.id }); }}>
                  Withdraw dispute
                </Button>}
            </div>
            {showEvents === d.id && <div className="mt-3 rounded-lg bg-muted p-3">
              {eventsQuery.isLoading ? "Loading history…" :
                eventsQuery.error ? <span className="text-destructive">Could not load history.</span> :
                  <ol className="space-y-2">{(eventsQuery.data ?? []).map(event =>
                    <li key={event.id}><strong>{event.kind}</strong> · {memberName(event.actor_id)}
                      <span className="text-xs text-muted-foreground"> · {new Date(event.created_at).toLocaleString()}</span>
                      {event.body && <p className="whitespace-pre-wrap">{event.body}</p>}</li>)}</ol>}
            </div>}
            {d.status === "open" && (uid === d.opened_by || uid === c?.payer_id || uid === r?.recipient_id || isOrganizer) && <div className="mt-3 space-y-2">
              <label htmlFor={"dispute-note-"+d.id} className="text-xs font-medium">Add evidence or a note</label>
              <Textarea id={"dispute-note-"+d.id} maxLength={2000} value={draftNote[d.id] ?? ""}
                onChange={e => setDraftNote(prev => ({ ...prev, [d.id]: e.target.value }))} />
              <Button size="sm" variant="outline" disabled={busy || !(draftNote[d.id] ?? "").trim()}
                onClick={() => void perform("Note added to dispute", "add_dispute_note", { _dispute: d.id, _body: draftNote[d.id]?.trim() }, () => setDraftNote(prev => ({ ...prev, [d.id]: "" })))}>Add note</Button>
            </div>}
            {canResolve && <div className="mt-3 space-y-2">
              <label htmlFor={"resolve-"+d.id} className="text-xs font-medium">Independent resolution explanation</label>
              <Textarea id={"resolve-"+d.id} maxLength={2000} value={draftResolution[d.id] ?? ""}
                onChange={e => setDraftResolution(prev => ({ ...prev, [d.id]: e.target.value }))} />
              <Button size="sm" disabled={busy || !(draftResolution[d.id] ?? "").trim()}
                onClick={() => { if (window.confirm("Record this dispute resolution? This does not reverse a payment.")) void perform("Dispute resolved", "resolve_dispute", { _dispute: d.id, _resolution: draftResolution[d.id]?.trim() }); }}>
                Resolve dispute
              </Button>
            </div>}
          </div>;
        })}</div>}
      <div className="space-y-2 border-t pt-3">
        <h3 className="font-medium text-sm">Open a payment dispute</h3>
        <p className="text-xs text-muted-foreground">The payer, round recipient, or organizer can dispute a reported contribution before the payout is recorded. State the reason (10–2,000 characters).</p>
        {status === "active" && contributions.filter(c => {
          const r = roundById.get(c.round_id);
          return r && canOpenDispute({
            payerId: c.payer_id, recipientId: r.recipient_id, viewerId: uid,
            viewerIsOrganizer: isOrganizer, payoutRecorded: Boolean(r.payout_recorded_at),
            hasOpenDispute: openByContribution.has(c.id),
          });
        }).map(c => {
          const r = roundById.get(c.round_id)!;
          return <div key={c.id} className="rounded-lg border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Round {r.round_number} · {memberName(c.payer_id)}</span>
              <Button size="sm" variant="outline" onClick={() => { setDraftFor(draftFor === c.id ? null : c.id); setDraftReason(""); }}>
                {draftFor === c.id ? "Cancel" : "Open dispute"}
              </Button>
            </div>
            {draftFor === c.id && <div className="mt-3 space-y-2">
              <label className="text-xs font-medium" htmlFor={"reason-"+c.id}>Reason for dispute</label>
              <Textarea id={"reason-"+c.id} maxLength={2000} value={draftReason} onChange={e => setDraftReason(e.target.value)} />
              <Button size="sm" disabled={busy || draftReason.trim().length < 10} onClick={() =>
                void perform("Dispute opened; payout blocked pending resolution", "open_dispute",
                  { _contribution: c.id, _reason: draftReason.trim() },
                  () => { setDraftFor(null); setDraftReason(""); })}>
                Submit dispute
              </Button>
            </div>}
          </div>;
        })}
        {status !== "active" && <p className="text-xs text-muted-foreground">Opening disputes is unavailable while this circle is {status}.</p>}
      </div>
    </Card>
  </section>;
}

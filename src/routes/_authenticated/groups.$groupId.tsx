import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Plus, ShieldCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, ErrorBox } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Notice, Pill, ContributionPill, PayoutPill } from "@/components/status";
import { TermsView, type TermsSnapshot } from "@/components/terms-view";
import { groupQuery, invitesQuery } from "@/lib/api";
import { contributionStatus, payoutStatus, roundTotals, formatMoney, formatDate, toNumber, PERIOD_LABEL, todayInTimeZone } from "@/lib/equb";

export const Route = createFileRoute("/_authenticated/groups/$groupId")({
  head: () => ({ meta: [{ title: "Circle details" }, { name: "robots", content: "noindex" }] }),
  component: CircleDetails,
});

function CircleDetails() {
  const { groupId } = Route.useParams();
  const qc = useQueryClient();
  const q = useQuery(groupQuery(groupId));
  const iq = useQuery({ ...invitesQuery(groupId), enabled: q.data?.isOrganizer === true });
  const [working, setWorking] = useState(false);
  const [reportRound, setReportRound] = useState("");
  const [reportPayer, setReportPayer] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [disputeContribution, setDisputeContribution] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [resolutions, setResolutions] = useState<Record<string, string>>({});
  const [terminationReason, setTerminationReason] = useState("");

  async function act(label: string, fn: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>) {
    if (working) return;
    setWorking(true);
    try {
      const result = await fn();
      if (result.error) throw result.error;
      toast.success(label);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["group", groupId] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
        qc.invalidateQueries({ queryKey: ["invites", groupId] }),
      ]);
      return result.data;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
      return undefined;
    } finally {
      setWorking(false);
    }
  }

  if (q.isLoading) return <Loading label="Loading circle…" />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <Card><h2 className="font-semibold">Circle unavailable</h2><p className="mt-2 text-sm text-muted-foreground">You may not belong to this circle, or it no longer exists.</p><Button asChild variant="outline" className="mt-4"><Link to="/dashboard">Back to your circles</Link></Button></Card>;

  const { uid, group: g, members, rounds, contributions, activity, isOrganizer, consentIds, missed, disputes, terminations, termConsentIds, reconciliation } = q.data;
  const ordered = [...rounds].sort((a, b) => a.round_number - b.round_number);
  const memberIds = members.map((m) => m.user_id);
  const byId = new Map(members.map((m) => [m.user_id, m.display_name]));
  const memberName = (id: string | null) => id ? (byId.get(id) ?? "Member") : "Not assigned";
  const today = todayInTimeZone(g.timezone);
  const amount = toNumber(g.contribution_amount);
  const openInvites = iq.data?.filter((i) => !i.revoked && i.uses < i.max_uses && new Date(i.expires_at).getTime() > Date.now()) ?? [];

  // Server re-checks every rule; these flags only decide which controls to show.
  const isVerifier = isOrganizer || consentIds.has(uid);
  const isActive = g.status === "active";
  const contributionById = new Map(contributions.map((c) => [c.id, c]));
  const roundById = new Map(rounds.map((r) => [r.id, r]));
  const openMissed = missed.filter((m) => !m.resolved_at);
  const openDisputes = disputes.filter((d) => d.status === "open");
  const pendingTermination = terminations.find((t) => !t.effective_at);
  const allPayoutsConfirmed = rounds.length > 0 && rounds.every((r) => r.recipient_confirmed_at);

  async function createInvite() {
    const data = await act("Invitation created", () => supabase.rpc("create_invite", { _group: groupId, _days: 7, _max_uses: 1 }));
    if (typeof data === "string") setInviteCode(data);
  }

  async function submitContribution() {
    const round = ordered.find((r) => r.id === reportRound);
    const payer = reportPayer || uid;
    if (!round || !memberIds.includes(payer)) return toast.error("Select a round and an eligible member.");
    const data = await act("Contribution reported as unverified", () => supabase.rpc("record_contribution", {
      _round: round.id, _payer: payer, _amount: amount, _note: reportNote.trim(),
    }));
    if (data !== undefined) { setReportRound(""); setReportPayer(""); setReportNote(""); }
  }

  async function toggleVerifierConsent() {
    if (consentIds.has(uid)) {
      await act("Verifier consent withdrawn", () => supabase.rpc("withdraw_verifier_consent", { _group: groupId }));
    } else {
      await act("You are now an independent verifier", () => supabase.rpc("consent_to_verify", { _group: groupId }));
    }
  }

  async function submitDispute() {
    const c = contributionById.get(disputeContribution);
    if (!c || !disputeReason.trim()) return toast.error("Explain the reason for the dispute.");
    const data = await act("Dispute opened; payout is held for this round", () => supabase.rpc("open_dispute", {
      _contribution: c.id, _reason: disputeReason.trim(),
    }));
    if (data !== undefined) { setDisputeContribution(""); setDisputeReason(""); }
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-primary"><ArrowLeft className="size-4" /> Your circles</Link>
      <PageHeader title={g.name} subtitle={g.description || "Private rotating savings circle"} action={<Pill tone={g.status === "active" ? "success" : "info"}>{g.status}</Pill>} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-xs text-muted-foreground">Contribution per round</p><p className="mt-1 text-xl font-semibold">{formatMoney(g.contribution_amount, g.currency)}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Payout per round</p><p className="mt-1 text-xl font-semibold">{formatMoney(amount * memberIds.length, g.currency)}</p><p className="text-xs text-muted-foreground">Based on current members</p></Card>
        <Card><p className="text-xs text-muted-foreground">Participants</p><p className="mt-1 text-xl font-semibold">{memberIds.length} / {g.max_members}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Frequency</p><p className="mt-1 text-xl font-semibold">{PERIOD_LABEL[g.periodicity]}</p></Card>
      </div>

      <Notice>Equb records contributions and payouts performed outside the app. A recorded payment is not verified until the required independent confirmations are complete. The recipient contributes in every round.</Notice>

      {pendingTermination && (
        <Notice tone="warning">
          <strong>Early termination requested.</strong> Reason: {pendingTermination.reason}. The circle ends only when every member consents ({termConsentIds.size} of {memberIds.length} so far).
        </Notice>
      )}

      {(g.status === "forming" || isActive) && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="font-semibold">Independent verification</h2></div>
          <p className="text-sm text-muted-foreground">Other members confirm a payment only if they have agreed to act as verifiers. Nobody becomes a verifier without consenting. Organizers can verify other members' payments, but never their own.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone={isVerifier ? "success" : "neutral"}>{isOrganizer ? "Organizer" : consentIds.has(uid) ? "Verifier" : "Not a verifier"}</Pill>
            {!isOrganizer && <Button variant="outline" size="sm" disabled={working} onClick={() => { void toggleVerifierConsent(); }}>{consentIds.has(uid) ? "Withdraw as verifier" : "Agree to verify others"}</Button>}
          </div>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Circle terms</h2><Button variant="outline" size="sm" onClick={() => setShowTerms(!showTerms)} aria-expanded={showTerms}>{showTerms ? "Hide" : "View"} terms</Button></div>
        <p className="text-sm text-muted-foreground">Version {g.terms_version} · {g.payout_method} payout order · {g.timezone}</p>
        {showTerms && <TermsView t={{
          contribution_amount: amount, currency: g.currency, periodicity: g.periodicity, max_members: g.max_members,
          payout_amount: amount * g.max_members, start_date: g.start_date, timezone: g.timezone,
          payout_method: g.payout_method, eligibility: g.eligibility, dropout_rules: g.dropout_rules,
          missed_payment_rules: g.missed_payment_rules, dispute_rules: g.dispute_rules, refund_rules: g.refund_rules, rules: g.rules,
        } as TermsSnapshot} version={g.terms_version} />}
        {g.rules && !showTerms && <p className="whitespace-pre-wrap text-sm">{g.rules}</p>}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2"><Users className="size-5 text-primary" /><h2 className="font-semibold">Members and payout order</h2></div>
        <ol className="divide-y text-sm">
          {[...members].sort((a, b) => (a.payout_position ?? 999) - (b.payout_position ?? 999)).map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-2 py-3">
              <span><span className="mr-2 text-muted-foreground">{m.payout_position ?? "—"}.</span>{m.display_name}{m.user_id === uid ? " (you)" : ""}</span>
              <span className="flex flex-wrap justify-end gap-1">
                <Pill tone={m.role === "organizer" ? "info" : "neutral"}>{m.role}</Pill>
                {consentIds.has(m.user_id) && m.role !== "organizer" && <Pill tone="success">verifier</Pill>}
              </span>
            </li>
          ))}
        </ol>
        {isOrganizer && g.status === "forming" && (
          <div className="border-t pt-4">
            <Button disabled={working || memberIds.length < 2} onClick={() => {
              if (window.confirm("Generate the schedule and activate this circle? Every member must have accepted current terms.")) {
                void act("Schedule generated", () => supabase.rpc("generate_schedule", { _group: groupId }));
              }
            }}>Generate payout schedule</Button>
            <p className="mt-2 text-xs text-muted-foreground">Requires at least two members and acceptance of the latest terms.</p>
          </div>
        )}
      </Card>

      {isOrganizer && g.status === "forming" && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Invite members</h2>
          <p className="text-sm text-muted-foreground">Generate a one-use invitation, valid for seven days. Share only with the intended member.</p>
          <Button disabled={working} variant="outline" onClick={createInvite}><Plus className="mr-2 size-4" /> Create invitation</Button>
          {inviteCode && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted p-3 text-sm"><code className="break-all">{inviteCode}</code><Button variant="ghost" size="sm" onClick={() => { void navigator.clipboard.writeText(window.location.origin + "/join/" + inviteCode); toast.success("Invite link copied"); }}><Copy className="size-4" /> Copy link</Button></div>}
          {iq.isLoading && <p className="text-xs text-muted-foreground">Loading invites…</p>}
          {iq.error && <ErrorBox error={iq.error} onRetry={() => iq.refetch()} />}
          {openInvites.length > 0 && <ul className="space-y-2 text-sm">{openInvites.map((i) => <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><span>Invite ending {formatDate(i.expires_at.slice(0, 10))} · {i.uses}/{i.max_uses} uses</span><Button size="sm" variant="outline" disabled={working} onClick={() => { void act("Invite revoked", () => supabase.rpc("revoke_invite", { _invite: i.id })); }}>Revoke</Button></li>)}</ul>}
        </Card>
      )}

      {isActive && (openMissed.length > 0 || isOrganizer) && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Missed contributions</h2>
            {isOrganizer && <Button variant="outline" size="sm" disabled={working} onClick={() => { void act("Missed contributions checked", () => supabase.rpc("refresh_missed_contributions", { _group: groupId })); }}>Check for missed payments</Button>}
          </div>
          {openMissed.length === 0 ? <p className="text-sm text-muted-foreground">No open missed contributions.</p> : (
            <ul className="divide-y text-sm">
              {openMissed.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span>Round {m.round_number} · {memberName(m.payer_id)}{m.payer_id === uid ? " (you)" : ""}</span>
                  <span className="text-xs text-muted-foreground">Due {formatDate(m.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">A missed-contribution flag records that a payment was not verified by its due date. It does not move money.</p>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Contribution and payout rounds</h2>
        {ordered.length === 0 && <Card><p className="text-sm text-muted-foreground">The payout schedule has not been generated.</p></Card>}
        {ordered.map((r) => {
          const mine = contributions.find((c) => c.round_id === r.id && c.payer_id === uid);
          const rc = contributions.filter((c) => c.round_id === r.id);
          const totals = roundTotals(r, memberIds, amount, contributions);
          const allConfirmed = memberIds.length > 0 && memberIds.every((id) => {
            const entry = rc.find((c) => c.payer_id === id);
            return entry && contributionStatus(entry) === "confirmed";
          });
          const roundDisputed = openDisputes.some((d) => d.round_id === r.id);
          return (
            <Card key={r.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h3 className="font-semibold">Round {r.round_number} · {formatDate(r.due_date)}</h3><p className="mt-1 text-sm text-muted-foreground">Payout recipient: {memberName(r.recipient_id)}</p></div>
                <PayoutPill status={payoutStatus(r)} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Expected</p><p className="font-medium">{formatMoney(totals.expected, g.currency)}</p></div>
                <div><p className="text-xs text-muted-foreground">Reported</p><p className="font-medium">{formatMoney(totals.recorded, g.currency)}</p></div>
                <div><p className="text-xs text-muted-foreground">Confirmed</p><p className="font-medium">{formatMoney(totals.confirmed, g.currency)}</p></div>
              </div>
              {r.due_date < today && totals.confirmed < totals.expected && <Notice tone="warning">Due date passed; some contributions remain unverified.</Notice>}
              {roundDisputed && <Notice tone="warning">An open dispute holds the payout for this round.</Notice>}
              <div className="overflow-x-auto"><table className="w-full min-w-[320px] text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2 pr-2">Member</th><th className="py-2 pr-2">Status</th><th className="py-2">Action</th></tr></thead>
                <tbody>{members.map((m) => {
                  const c = rc.find((x) => x.payer_id === m.user_id);
                  const cs = contributionStatus(c);
                  const canPayerConfirm = !!c && c.payer_id === uid && !c.payer_confirmed_at;
                  const canVerify = !!c && c.payer_id !== uid && isVerifier && !c.organizer_confirmed_at;
                  const canDispute = !!c && !r.payout_recorded_at && (c.payer_id === uid || r.recipient_id === uid || isOrganizer)
                    && !openDisputes.some((d) => d.contribution_id === c.id);
                  return (
                    <tr key={m.user_id} className="border-b last:border-0">
                      <td className="py-3 pr-2">{m.display_name}{m.user_id === uid ? " (you)" : ""}</td>
                      <td className="py-3 pr-2"><ContributionPill status={cs} /></td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          {(canPayerConfirm || canVerify) && <Button variant="outline" size="sm" disabled={working} onClick={() => { void act("Confirmation submitted", () => supabase.rpc("confirm_contribution", { _contribution: c!.id })); }}>{canPayerConfirm ? "Confirm my payment" : "Verify payment"}</Button>}
                          {canDispute && <Button variant="ghost" size="sm" disabled={working} onClick={() => setDisputeContribution(c!.id)}>Dispute</Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {!mine && isActive && <Button variant="outline" size="sm" disabled={working} onClick={() => { setReportRound(r.id); setReportPayer(uid); }}>Report my contribution</Button>}
                {isOrganizer && isActive && <Button variant="outline" size="sm" disabled={working} onClick={() => { setReportRound(r.id); setReportPayer(uid); }}>Record contribution</Button>}
                {isOrganizer && isActive && !r.payout_recorded_at && <Button size="sm" disabled={working || !allConfirmed || roundDisputed} onClick={() => {
                  if (window.confirm("Record an off-platform payout for this round?")) void act("Payout reported; awaiting recipient", () => supabase.rpc("record_payout", { _round: r.id, _note: payoutNote.trim() }));
                }}>Record off-platform payout</Button>}
                {uid === r.recipient_id && r.payout_recorded_at && !r.recipient_confirmed_at && <Button size="sm" disabled={working} onClick={() => { void act("Payout receipt confirmed", () => supabase.rpc("confirm_payout", { _round: r.id })); }}>Confirm receipt</Button>}
              </div>
              {isOrganizer && isActive && !r.payout_recorded_at && <div><label className="text-xs text-muted-foreground" htmlFor={"note-" + r.id}>Payout note (optional)</label><Input id={"note-" + r.id} value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)} maxLength={500} placeholder="External transaction reference (no secrets)" /></div>}
            </Card>
          );
        })}
      </section>

      {disputeContribution && <Card className="space-y-3">
        <h2 className="font-semibold">Open a dispute</h2>
        <p className="text-sm text-muted-foreground">Disputing {memberName(contributionById.get(disputeContribution)?.payer_id ?? null)}'s contribution in round {roundById.get(contributionById.get(disputeContribution)?.round_id ?? "")?.round_number ?? "—"}. The round's payout is held until the dispute is resolved.</p>
        <label className="block text-sm" htmlFor="dispute-reason">Reason</label>
        <Textarea id="dispute-reason" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} maxLength={1000} />
        <div className="flex flex-wrap gap-2"><Button disabled={working || !disputeReason.trim()} onClick={() => { void submitDispute(); }}>Open dispute</Button><Button variant="outline" onClick={() => { setDisputeContribution(""); setDisputeReason(""); }}>Cancel</Button></div>
      </Card>}

      {openDisputes.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Open disputes</h2>
          <ul className="space-y-3 text-sm">
            {openDisputes.map((d) => {
              const payer = contributionById.get(d.contribution_id)?.payer_id ?? null;
              const round = roundById.get(d.round_id);
              const canResolve = isVerifier && d.opened_by !== uid && payer !== uid;
              return (
                <li key={d.id} className="space-y-2 rounded-lg border p-3">
                  <p>Round {round?.round_number ?? "—"} · {memberName(payer)} · opened by {memberName(d.opened_by)}</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{d.reason}</p>
                  {canResolve && (
                    <div className="space-y-2">
                      <label className="block text-xs text-muted-foreground" htmlFor={"res-" + d.id}>Resolution (required)</label>
                      <Textarea id={"res-" + d.id} value={resolutions[d.id] ?? ""} maxLength={1000} onChange={(e) => setResolutions({ ...resolutions, [d.id]: e.target.value })} />
                      <Button size="sm" disabled={working || !(resolutions[d.id] ?? "").trim()} onClick={() => { void act("Dispute resolved", () => supabase.rpc("resolve_dispute", { _dispute: d.id, _resolution: (resolutions[d.id] ?? "").trim() })); }}>Resolve dispute</Button>
                    </div>
                  )}
                  {d.opened_by === uid && <Button size="sm" variant="outline" disabled={working} onClick={() => { void act("Dispute withdrawn", () => supabase.rpc("withdraw_dispute", { _dispute: d.id })); }}>Withdraw my dispute</Button>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {isOrganizer && isActive && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Complete the circle</h2>
          <p className="text-sm text-muted-foreground">Available once every round's payout receipt is confirmed. Completion closes further confirmations.</p>
          <Button variant="outline" disabled={working || !allPayoutsConfirmed} onClick={() => {
            if (window.confirm("Mark this circle complete? Confirmations will close.")) void act("Circle completed", () => supabase.rpc("complete_circle", { _group: groupId }));
          }}>Mark circle complete</Button>
        </Card>
      )}

      {isOrganizer && isActive && !pendingTermination && (
        <Card className="space-y-3">
          <h2 className="font-semibold">End the circle early</h2>
          <p className="text-sm text-muted-foreground">Early termination needs unanimous consent: every member, including you, must agree. Your request counts as your consent.</p>
          <label className="block text-sm" htmlFor="term-reason">Reason</label>
          <Textarea id="term-reason" value={terminationReason} maxLength={1000} onChange={(e) => setTerminationReason(e.target.value)} />
          <Button variant="outline" disabled={working || !terminationReason.trim()} onClick={() => { void act("Termination requested", () => supabase.rpc("request_termination", { _group: groupId, _reason: terminationReason.trim() })); setTerminationReason(""); }}>Request termination</Button>
        </Card>
      )}

      {pendingTermination && !termConsentIds.has(uid) && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Consent to early termination</h2>
          <p className="text-sm text-muted-foreground">The circle ends only if every member consents. Withholding consent keeps the circle running.</p>
          <Button disabled={working} onClick={() => { void act("Consent recorded", () => supabase.rpc("consent_termination", { _group: groupId })); }}>Consent to end the circle</Button>
        </Card>
      )}

      {reconciliation.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Reconciliation</h2>
          <p className="text-sm text-muted-foreground">Confirmed contributions and payouts per member. Net position is what each member has paid in minus what they have received.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2 pr-2">Member</th><th className="py-2 pr-2">Contributions</th><th className="py-2 pr-2">Payouts</th><th className="py-2">Net</th></tr></thead>
              <tbody>{reconciliation.map((row) => (
                <tr key={row.user_id} className="border-b last:border-0">
                  <td className="py-3 pr-2">{row.display_name}{row.user_id === uid ? " (you)" : ""}</td>
                  <td className="py-3 pr-2">{formatMoney(row.contributions_confirmed, g.currency)} / {formatMoney(row.contributions_expected, g.currency)}</td>
                  <td className="py-3 pr-2">{formatMoney(row.payout_confirmed, g.currency)} / {formatMoney(row.payout_expected, g.currency)}</td>
                  <td className="py-3">{formatMoney(row.net_position, g.currency)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {reportRound && <Card className="space-y-3">
        <h2 className="font-semibold">Record contribution — round {ordered.find((r) => r.id === reportRound)?.round_number}</h2>
        <p className="text-sm text-muted-foreground">This reports a payment made outside the app. It does not move money or prove payment.</p>
        {isOrganizer && <label className="block text-sm">Member<select className="mt-1 w-full rounded-lg border bg-background p-3" value={reportPayer} onChange={(e) => setReportPayer(e.target.value)}>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}</select></label>}
        <p className="text-sm">Agreed amount: <strong>{formatMoney(amount, g.currency)}</strong></p>
        <label className="block text-sm" htmlFor="report-note">Note (optional)</label>
        <Textarea id="report-note" value={reportNote} onChange={(e) => setReportNote(e.target.value)} maxLength={500} />
        <div className="flex gap-2"><Button disabled={working} onClick={submitContribution}>Save unverified record</Button><Button variant="outline" onClick={() => setReportRound("")}>Cancel</Button></div>
      </Card>}

      <Card className="space-y-3">
        <h2 className="font-semibold">Recent activity</h2>
        {activity.length === 0 ? <p className="text-sm text-muted-foreground">No activity has been recorded.</p> : <ol className="divide-y text-sm">{activity.slice(0, 25).map((a) => <li key={a.id} className="py-3"><span className="font-medium">{a.action.replaceAll("_", " ")}</span><span className="ml-2 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span></li>)}</ol>}
      </Card>
    </div>
  );
}

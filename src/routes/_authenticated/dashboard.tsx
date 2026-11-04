import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, Users } from "lucide-react";
import { PageHeader, Loading, ErrorBox, Card } from "@/components/page";
import { EmptyState, Pill } from "@/components/status";
import { Button } from "@/components/ui/button";
import { dashboardQuery } from "@/lib/api";
import { currentRound, formatDate, formatMoney, outstandingForUser, PERIOD_LABEL, todayInTimeZone, toNumber } from "@/lib/equb";
import { DISCLAIMER } from "@/config/app";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const q = useQuery(dashboardQuery());
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const { uid, groups, rounds, contributions, members, memberships } = q.data;
  return (
    <>
      <PageHeader title="Your circles" subtitle={DISCLAIMER} action={<Button asChild className="rounded-xl"><Link to="/groups/new"><PlusCircle /> New circle</Link></Button>} />
      {groups.length === 0 ? (
        <EmptyState icon={<Users />} title="No circles yet" body="Create a circle or join one with an invite code from an organizer."
          action={<div className="flex gap-2"><Button asChild><Link to="/groups/new">Create a circle</Link></Button><Button asChild variant="outline"><Link to="/join">Enter code</Link></Button></div>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((g) => {
            const today = todayInTimeZone(g.timezone);
            const gr = rounds.filter((r) => r.group_id === g.id);
            const gc = contributions.filter((c) => c.group_id === g.id);
            const cur = currentRound(gr, today);
            const myPayout = gr.find((r) => r.recipient_id === uid);
            const owed = outstandingForUser(uid, gr, gc, toNumber(g.contribution_amount), today);
            const count = members.filter((m) => m.group_id === g.id).length;
            const role = memberships.find((m) => m.group_id === g.id)?.role;
            return (
              <Link key={g.id} to="/groups/$groupId" params={{ groupId: g.id }} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{g.name}</h3>
                      <p className="text-xs text-muted-foreground">{formatMoney(g.contribution_amount, g.currency)} · {PERIOD_LABEL[g.periodicity]} · {count}/{g.max_members} members</p>
                    </div>
                    <Pill tone={role === "organizer" ? "info" : "neutral"}>{role}</Pill>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">Next due</dt><dd className="font-medium">{cur ? `Round ${cur.round_number} · ${formatDate(cur.due_date)}` : gr.length ? "All rounds done" : "Schedule not built"}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Your payout</dt><dd className="font-medium">{myPayout ? `Round ${myPayout.round_number} · ${formatDate(myPayout.due_date)}` : "—"}</dd></div>
                    <div className="col-span-2"><dt className="text-xs text-muted-foreground">Your unrecorded amount (due rounds)</dt><dd className={owed > 0 ? "font-semibold text-warning-foreground" : "font-medium"}>{formatMoney(owed, g.currency)}</dd></div>
                  </dl>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
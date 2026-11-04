import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Loading, ErrorBox } from "@/components/page";
import { EmptyState } from "@/components/status";
import { Button } from "@/components/ui/button";
import { notificationsQuery } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Activity" }, { name: "robots", content: "noindex" }] }),
  component: Activity,
});

function Activity() {
  const qc = useQueryClient();
  const q = useQuery(notificationsQuery());
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} onRetry={() => q.refetch()} />;
  const items = q.data ?? [];
  async function markAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <>
      <PageHeader title="Activity" subtitle="In-app notifications only — no email or SMS is sent." action={items.some((n) => !n.read_at) && <Button variant="outline" size="sm" onClick={markAll}>Mark all read</Button>} />
      {items.length === 0 ? <EmptyState icon={<Bell />} title="Nothing yet" body="Invites, confirmations and schedule updates will show up here." /> : (
        <ul className="divide-y rounded-2xl border bg-card">
          {items.map((n) => (
            <li key={n.id} className="flex gap-3 p-4">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {n.group_id && <Link to="/groups/$groupId" params={{ groupId: n.group_id }} className="text-sm font-medium text-primary">Open</Link>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
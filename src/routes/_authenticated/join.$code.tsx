import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card, Loading, ErrorBox } from "@/components/page";
import { Notice } from "@/components/status";
import { TermsView, type TermsSnapshot } from "@/components/terms-view";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/join/$code")({
  head: () => ({ meta: [{ title: "Invitation" }, { name: "robots", content: "noindex" }] }),
  component: Invite,
});

type Preview = {
  valid: boolean; already_member?: boolean; exhausted?: boolean; full?: boolean;
  terms_version?: number; terms_published_at?: string; terms?: TermsSnapshot;
  group?: { id: string; name: string; description: string | null; member_count: number; max_members: number; organizer_name: string };
};

function Invite() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const q = useQuery({
    queryKey: ["invite", code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("preview_invite", { _code: code });
      if (error) throw error;
      return data as unknown as Preview;
    },
  });
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data) return <ErrorBox error={q.error} />;
  const p = q.data;
  if (!p.valid || !p.group || !p.terms) return <Card><h2 className="font-semibold">This invite isn't valid</h2><p className="mt-1 text-sm text-muted-foreground">It may have expired, been revoked, or been mistyped. Ask your organizer for a new one.</p></Card>;
  const g = p.group;

  async function act(kind: "accept" | "decline") {
    setBusy(true);
    const { data, error } = kind === "accept"
      ? await supabase.rpc("accept_invite_with_terms", { _code: code, _version: p.terms_version! })
      : await supabase.rpc("decline_invite", { _code: code });
    setBusy(false);
    if (error) { toast.error(error.message); q.refetch(); return; }
    if (kind === "accept") { toast.success(`You joined ${g.name}`); navigate({ to: "/groups/$groupId", params: { groupId: data as string } }); }
    else { toast("Invite declined"); navigate({ to: "/dashboard" }); }
  }

  return (
    <>
      <PageHeader title={g.name} subtitle={`Invited by ${g.organizer_name} · ${g.member_count}/${g.max_members} members`} />
      <Card className="space-y-5">
        {g.description && <p className="text-sm">{g.description}</p>}
        <h2 className="font-semibold">Review the circle terms</h2>
        <TermsView t={p.terms} version={p.terms_version!} publishedAt={p.terms_published_at} />
        {p.already_member ? <Button asChild><Link to="/groups/$groupId" params={{ groupId: g.id }}>Open circle</Link></Button>
          : p.full || p.exhausted ? <Notice tone="warning">{p.full ? "This circle is full." : "This invite has already been used."}</Notice>
          : <>
              <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                <input type="checkbox" className="mt-1 size-4" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I have read terms version {p.terms_version}. I agree to contribute every round until the circle ends, including after I receive my payout.</span>
              </label>
              <div className="flex gap-2">
                <Button className="flex-1 rounded-xl" disabled={busy || !agree} onClick={() => act("accept")}>Accept terms & join</Button>
                <Button variant="outline" className="flex-1 rounded-xl" disabled={busy} onClick={() => act("decline")}>Decline</Button>
              </div>
            </>}
      </Card>
    </>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Loading, ErrorBox, Card } from "@/components/page";
import { ProfileForm } from "@/components/profile-form";
import { meQuery } from "@/lib/api";
import { MODULES } from "@/modules";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Your profile" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const q = useQuery(meQuery());
  if (q.isLoading) return <Loading />;
  if (q.error || !q.data?.profile) return <ErrorBox error={q.error ?? new Error("Profile not found")} onRetry={() => q.refetch()} />;
  const upcoming = Object.values(MODULES).filter((m) => !m.enabled);
  return (
    <>
      <PageHeader title="Your profile" subtitle={<>Signed in as {q.data.user.email} · your email is never shown to other members.</>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card>
          <ProfileForm profile={q.data.profile} onSaved={() => qc.invalidateQueries({ queryKey: ["me"] })} />
        </Card>
        <Card className="h-fit">
          <h3 className="font-semibold">Coming later</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {upcoming.map((m) => <li key={m.label}>{m.label}</li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}
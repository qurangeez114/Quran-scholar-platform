import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { ProfileForm } from "@/components/profile-form";
import { Loading } from "@/components/page";
import { meQuery } from "@/lib/api";
import { DISCLAIMER } from "@/config/app";

export const Route = createFileRoute("/_authenticated/onboarding")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({ meta: [{ title: "Welcome" }, { name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(meQuery());
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/onboarding") ? next : "/dashboard";

  return (
    <div className="mx-auto min-h-screen max-w-lg px-5 py-8">
      <Brand />
      <h1 className="mt-10 text-2xl font-semibold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Members of your circles see only your display name and photo.</p>
      <div className="mt-5 flex gap-3 rounded-xl border bg-primary-soft p-4 text-sm text-accent-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>{DISCLAIMER}</p>
      </div>
      <div className="mt-6 rounded-3xl border bg-card p-6 shadow-card">
        {isLoading || !data?.profile ? (
          <Loading />
        ) : (
          <ProfileForm
            profile={data.profile}
            submitLabel="Continue"
            markOnboarded
            onSaved={async () => {
              await qc.invalidateQueries({ queryKey: ["me"] });
              navigate({ to: safeNext, replace: true });
            }}
          />
        )}
      </div>
    </div>
  );
}
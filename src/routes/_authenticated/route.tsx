import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Home, LogOut, PlusCircle, Ticket, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { notificationsQuery } from "@/lib/api";
import { DISCLAIMER } from "@/config/app";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    if (location.pathname !== "/onboarding") {
      const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", data.user.id).maybeSingle();
      if (profile && !profile.onboarded) {
        throw redirect({ to: "/onboarding", search: { next: location.href } });
      }
    }
    return { user: data.user };
  },
  component: AppShell,
});

const nav = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/groups/new", label: "New circle", icon: PlusCircle },
  { to: "/join", label: "Join", icon: Ticket },
  { to: "/activity", label: "Activity", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserRound },
] as const;

function AppShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: notes } = useQuery({ ...notificationsQuery(), refetchInterval: 60_000 });
  const unread = notes?.filter((n) => !n.read_at).length ?? 0;
  const onboarding = pathname === "/onboarding";

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (onboarding) return <Outlet />;

  const isActive = (to: string) => (to === "/dashboard" ? pathname === "/dashboard" || pathname.startsWith("/groups/") && pathname !== "/groups/new" : pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar p-5 text-sidebar-foreground md:flex">
        <Brand inverted />
        <nav className="mt-10 flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(n.to) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60",
              )}
            >
              <n.icon className="size-4.5" />
              {n.label}
              {n.to === "/activity" && unread > 0 && (
                <span className="ml-auto rounded-full bg-sidebar-primary px-2 text-xs font-semibold text-sidebar-primary-foreground">{unread}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-4">
          <p className="text-xs leading-relaxed text-sidebar-foreground/60">{DISCLAIMER}</p>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden">
          <Brand />
          <button onClick={signOut} aria-label="Sign out" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
            <LogOut className="size-5" />
          </button>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 md:pb-12 md:pt-10">
          <Outlet />
        </main>
      </div>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 pt-1.5 backdrop-blur md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className={cn("relative flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium", isActive(n.to) ? "text-primary" : "text-muted-foreground")}
          >
            <n.icon className="size-5.5" />
            {n.label}
            {n.to === "/activity" && unread > 0 && (
              <span className="absolute right-[22%] top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-bold text-primary-foreground">{unread}</span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
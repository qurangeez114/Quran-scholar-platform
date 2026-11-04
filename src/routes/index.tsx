import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookCheck, CalendarClock, ShieldCheck, Users, HandCoins, Ban } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app";
import hero from "@/assets/hero-community.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_CONFIG.name} — Coordinate your Equb circle` },
      {
        name: "description",
        content: "Run your Equb rotating savings circle with clear schedules, two-party confirmed records and a transparent log. Coordination only — no money held.",
      },
      { property: "og:title", content: `${APP_CONFIG.name} — Coordinate your Equb circle` },
      { property: "og:description", content: "Schedules, confirmations and a shared ledger for Equb circles. We never hold or move money." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: CalendarClock, title: "Clear round schedule", body: "Weekly, biweekly or monthly rounds with due dates in your group's timezone." },
  { icon: BookCheck, title: "Two-party confirmations", body: "Every contribution and payout is confirmed by both sides, with a full audit log." },
  { icon: Users, title: "Private by default", body: "Groups are invite-only. Members see display names — never contact details." },
  { icon: ShieldCheck, title: "Fair, visible rules", body: "Interest-free by design. Rotating or organizer-set payout order, agreed in written terms every member accepts." },
];

function Landing() {
  return (
    <PublicShell>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-2 md:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
            Equb · ዕቁብ · እቁብ
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.1] sm:text-5xl">
            The trusted way to keep your Equb circle in sync.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Plan rounds, record contributions, and confirm every payout together — wherever your members live.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start a circle <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6 text-base">
              <Link to="/auth">I have an invite code</Link>
            </Button>
          </div>
          <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
            <Ban className="mt-0.5 size-4 shrink-0 text-primary" />
            Coordination and record-keeping only. We don't hold, move or transmit money.
          </p>
        </div>
        <div className="relative">
          <img
            src={hero}
            alt="Members of an Equb circle reviewing their schedule over coffee"
            width={1280}
            height={960}
            className="aspect-[4/3] w-full rounded-3xl object-cover shadow-card"
          />
          <div className="absolute -bottom-6 left-4 right-4 rounded-2xl border bg-card p-4 shadow-card sm:left-auto sm:right-6 sm:w-72">
            <p className="text-xs font-medium text-muted-foreground">Round 4 of 10 · Monthly</p>
            <p className="mt-1 font-display text-lg font-semibold">Next recipient: Selam</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-4/5 rounded-full bg-primary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">8 of 10 contributions confirmed by both sides · example</p>
          </div>
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title}>
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="bg-ink-gradient rounded-3xl p-8 text-ink-foreground sm:p-12">
          <HandCoins className="size-8 text-sidebar-primary" />
          <h2 className="mt-4 max-w-2xl text-2xl font-semibold sm:text-3xl">Money moves the way your circle already does it.</h2>
          <p className="mt-3 max-w-2xl text-sidebar-foreground/80">
            Members pay each other outside the app — cash, bank transfer, whatever your group agrees. {APP_CONFIG.name} keeps
            the shared record honest: who recorded what, who confirmed it, and when.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="h-12 rounded-xl">
              <Link to="/auth" search={{ mode: "signup" }}>Create a free account</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-12 rounded-xl text-ink-foreground hover:bg-sidebar-accent hover:text-ink-foreground">
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
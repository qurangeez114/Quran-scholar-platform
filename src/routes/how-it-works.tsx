import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
import { APP_CONFIG } from "@/config/app";
import { PAYOUT_METHOD_RULES } from "@/lib/equb";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: `How it works — ${APP_CONFIG.name}` },
      { name: "description", content: "How Equb circles are planned, recorded and confirmed. Coordination only: no payments, no custody." },
      { property: "og:title", content: `How it works — ${APP_CONFIG.name}` },
      { property: "og:description", content: "Rounds, two-party confirmations, payout rules and what this app does not do." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  ["Create a circle", "Set the currency, amount per round, schedule, timezone, size and written rules. Groups are private."],
  ["Invite members", "Share a private invite code or link. Invitees see a summary and choose to accept or decline."],
  ["Build the schedule", "The organizer locks in the payout order using the rule everyone agreed to."],
  ["Record & confirm", "Pay each other outside the app, then record it. The payer and organizer each confirm separately."],
  ["Confirm payouts", "The organizer marks a round paid outside the app; the recipient confirms receipt."],
];

function HowItWorks() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">How it works</h1>
        <p className="mt-3 text-muted-foreground">An Equb is a rotating savings circle: everyone contributes each round, and one member receives the full pot.</p>
        <ol className="mt-10 space-y-5">
          {steps.map(([t, b], i) => (
            <li key={t} className="flex gap-4 rounded-2xl border bg-card p-5 shadow-card">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-display font-semibold text-primary-foreground">{i + 1}</span>
              <div>
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b}</p>
              </div>
            </li>
          ))}
        </ol>
        <h2 className="mt-14 text-2xl font-semibold">Payout order rules</h2>
        <div className="mt-5 space-y-3">
          {Object.values(PAYOUT_METHOD_RULES).map((r) => (
            <div key={r.label} className="rounded-xl border bg-card p-4">
              <p className="font-medium">{r.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{r.rule}</p>
            </div>
          ))}
        </div>
        <h2 className="mt-14 text-2xl font-semibold">What this app does not do</h2>
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>Hold, move, transmit or exchange money, or link bank accounts.</li>
          <li>Guarantee that any member pays or receives.</li>
          <li>Provide credit scores, insurance, tax advice or public ratings of members.</li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">All amounts are records entered by members and show as "not verified" until both sides confirm.</p>
        <Button asChild size="lg" className="mt-10 h-12 rounded-xl">
          <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
        </Button>
      </div>
    </PublicShell>
  );
}
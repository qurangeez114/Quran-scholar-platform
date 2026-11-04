import { cva, type VariantProps } from "class-variance-authority";
import { CheckCircle2, CircleDashed, Clock, AlertTriangle, Circle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CONTRIBUTION_LABEL, PAYOUT_LABEL, type ContributionStatus, type PayoutStatus } from "@/lib/equb";

const pill = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      pending: "bg-warning-soft text-warning-foreground",
      success: "bg-success-soft text-success",
      info: "bg-primary-soft text-accent-foreground",
      danger: "bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Pill({ tone, children, className }: VariantProps<typeof pill> & { children: ReactNode; className?: string }) {
  return <span className={cn(pill({ tone }), className)}>{children}</span>;
}

export function ContributionPill({ status }: { status: ContributionStatus }) {
  const map = {
    missing: { tone: "neutral", Icon: Circle },
    recorded: { tone: "pending", Icon: CircleDashed },
    payer_confirmed: { tone: "pending", Icon: Clock },
    organizer_confirmed: { tone: "pending", Icon: Clock },
    confirmed: { tone: "success", Icon: CheckCircle2 },
  } as const;
  const { tone, Icon } = map[status];
  return (
    <Pill tone={tone}>
      <Icon className="size-3.5" />
      {CONTRIBUTION_LABEL[status]}
    </Pill>
  );
}

export function PayoutPill({ status }: { status: PayoutStatus }) {
  const tone = status === "confirmed" ? "success" : status === "recorded" ? "pending" : "info";
  const Icon = status === "confirmed" ? CheckCircle2 : status === "recorded" ? Clock : CircleDashed;
  return (
    <Pill tone={tone}>
      <Icon className="size-3.5" />
      {PAYOUT_LABEL[status]}
    </Pill>
  );
}

export function Notice({ tone = "info", children, icon }: { tone?: "info" | "warning"; children: ReactNode; icon?: ReactNode }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-3.5 text-sm",
        tone === "warning" ? "border-warning/30 bg-warning-soft text-warning-foreground" : "border-primary/20 bg-primary-soft text-accent-foreground",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon ?? <AlertTriangle className="size-4" />}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">{icon}</div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
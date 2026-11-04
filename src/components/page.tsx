import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : (error as { message?: string })?.message ?? "Something went wrong";
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
      <p className="font-medium text-destructive">Couldn't load this</p>
      <p className="mt-1 text-muted-foreground">{msg}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 font-medium text-primary">Try again</button>
      )}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border bg-card p-5 shadow-card ${className}`}>{children}</div>;
}
import { Link } from "@tanstack/react-router";
import { APP_CONFIG } from "@/config/app";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <circle cx="16" cy="16" r="8.5" fill="none" strokeWidth="2.4" className="stroke-primary-foreground" strokeDasharray="10 3.4" />
      <circle cx="16" cy="16" r="2.6" className="fill-primary-foreground" />
    </svg>
  );
}

export function Brand({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2.5 font-display text-lg font-semibold", className)}>
      <LogoMark />
      <span className={inverted ? "text-sidebar-foreground" : "text-foreground"}>{APP_CONFIG.name}</span>
    </Link>
  );
}
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { APP_CONFIG, DISCLAIMER } from "@/config/app";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/how-it-works"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-block"
              activeProps={{ className: "text-foreground" }}
            >
              How it works
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 text-sm text-muted-foreground sm:px-6 md:grid-cols-2">
          <div>
            <Brand />
            <p className="mt-3 max-w-md">{DISCLAIMER}</p>
          </div>
          <div className="flex gap-6 md:justify-end">
            <Link to="/how-it-works" className="hover:text-foreground">How it works</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            <span>© {new Date().getFullYear()} {APP_CONFIG.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
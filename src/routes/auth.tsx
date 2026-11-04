import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_CONFIG, DISCLAIMER } from "@/config/app";

const search = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: `Sign in — ${APP_CONFIG.name}` },
      { name: "description", content: `Sign in or create your ${APP_CONFIG.name} account.` },
      { property: "og:title", content: `Sign in — ${APP_CONFIG.name}` },
      { property: "og:description", content: "Access your Equb circles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const REDIRECT_KEY = "post_auth_redirect";
function safePath(p?: string | null) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/dashboard";
}

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const pwSchema = z.string().min(8, "At least 8 characters").max(72);

function AuthPage() {
  const { mode = "signin", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<null | "confirm" | "reset">(null);

  useEffect(() => {
    if (redirect) sessionStorage.setItem(REDIRECT_KEY, safePath(redirect));
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const to = safePath(sessionStorage.getItem(REDIRECT_KEY));
        sessionStorage.removeItem(REDIRECT_KEY);
        navigate({ to, replace: true });
      }
    });
  }, [redirect, navigate]);

  const goNext = () => {
    const to = safePath(sessionStorage.getItem(REDIRECT_KEY) ?? redirect);
    sessionStorage.removeItem(REDIRECT_KEY);
    navigate({ to, replace: true });
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = emailSchema.safeParse(email);
    if (!em.success) return toast.error(em.error.issues[0].message);
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
        return;
      }
      const pw = pwSchema.safeParse(password);
      if (!pw.success) return toast.error(pw.error.issues[0].message);
      if (mode === "signup") {
        const dn = z.string().trim().min(1, "Enter a display name").max(60).safeParse(name);
        if (!dn.success) return toast.error(dn.error.issues[0].message);
        const { data, error } = await supabase.auth.signUp({
          email: em.data,
          password: pw.data,
          options: { emailRedirectTo: window.location.origin + "/auth", data: { display_name: dn.data } },
        });
        if (error) throw error;
        if (data.session) goNext();
        else setSent("confirm");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: em.data, password: pw.data });
        if (error) throw error;
        goNext();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) return toast.error(result.error.message);
    if (result.redirected) return;
    goNext();
  }

  const title = mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Welcome back";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
        <Brand />
        <div className="mt-10 rounded-3xl border bg-card p-6 shadow-card sm:p-8">
          {sent ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {sent === "confirm"
                  ? `We sent a confirmation link to ${email}. Open it to finish creating your account.`
                  : `If an account exists for ${email}, a reset link is on its way.`}
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setSent(null)} asChild>
                <Link to="/auth" search={{ mode: "signin", redirect }}>Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">{title}</h1>
              {redirect?.startsWith("/join") && (
                <p className="mt-2 text-sm text-muted-foreground">Sign in or create an account to view your invite.</p>
              )}
              <form onSubmit={submit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Display name</Label>
                    <Input id="name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Selam T." />
                    <p className="text-xs text-muted-foreground">Shown to members of your groups.</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <Link to="/auth" search={{ mode: "forgot", redirect }} className="text-xs font-medium text-primary">Forgot?</Link>
                      )}
                    </div>
                    <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} className="h-11" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                )}
                <Button type="submit" className="h-11 w-full rounded-xl text-base" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
                </Button>
              </form>
              {mode !== "forgot" && (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
                  </div>
                  <Button variant="outline" className="h-11 w-full rounded-xl" onClick={google}>
                    Continue with Google
                  </Button>
                </>
              )}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>Already have an account? <Link to="/auth" search={{ mode: "signin", redirect }} className="font-medium text-primary">Sign in</Link></>
                ) : (
                  <>New here? <Link to="/auth" search={{ mode: "signup", redirect }} className="font-medium text-primary">Create an account</Link></>
                )}
              </p>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{DISCLAIMER}</p>
      </div>
    </div>
  );
}
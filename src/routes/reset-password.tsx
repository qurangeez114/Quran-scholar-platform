import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_CONFIG } from "@/config/app";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: `Set a new password — ${APP_CONFIG.name}` },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: `Set a new password — ${APP_CONFIG.name}` },
      { property: "og:description", content: "Password reset." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session && isRecovery) setReady(true);
      else if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("At least 8 characters");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-8">
      <Brand />
      <div className="mt-10 rounded-3xl border bg-card p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">Open this page from the reset link in your email. Waiting for a valid reset session…</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" autoComplete="new-password" className="h-11" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <Button className="h-11 w-full rounded-xl" disabled={busy}>Update password</Button>
          </form>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LANGUAGES } from "@/config/app";
import type { Profile } from "@/lib/api";

const schema = z.object({
  display_name: z.string().trim().min(1, "Display name is required").max(60),
  full_name: z.string().trim().max(120).optional(),
  avatar_url: z.union([z.literal(""), z.string().trim().url("Photo must be a valid https URL").startsWith("https://", "Photo must start with https://").max(500)]),
  country: z.string().trim().max(60).optional(),
  city: z.string().trim().max(60).optional(),
  preferred_language: z.string(),
});

export function ProfileForm({
  profile,
  onSaved,
  submitLabel = "Save",
  markOnboarded,
}: {
  profile: Profile;
  onSaved?: () => void;
  submitLabel?: string;
  markOnboarded?: boolean;
}) {
  const [f, setF] = useState({
    display_name: profile.display_name ?? "",
    full_name: profile.full_name ?? "",
    avatar_url: profile.avatar_url ?? "",
    country: profile.country ?? "",
    city: profile.city ?? "",
    preferred_language: profile.preferred_language ?? "en",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(f);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const v = parsed.data;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: v.display_name,
        full_name: v.full_name || null,
        avatar_url: v.avatar_url || null,
        country: v.country || null,
        city: v.city || null,
        preferred_language: v.preferred_language,
        ...(markOnboarded ? { onboarded: true } : {}),
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved");
    onSaved?.();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Field id="display_name" label="Display name" hint="Visible to members of your circles.">
        <Input id="display_name" className="h-11" value={f.display_name} onChange={set("display_name")} maxLength={60} />
      </Field>
      <Field id="full_name" label="Full name (private)" hint="Only you can see this.">
        <Input id="full_name" className="h-11" value={f.full_name} onChange={set("full_name")} maxLength={120} />
      </Field>
      <Field id="avatar_url" label="Photo URL (optional)">
        <Input id="avatar_url" className="h-11" placeholder="https://…" value={f.avatar_url} onChange={set("avatar_url")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="country" label="Country (private, optional)">
          <Input id="country" className="h-11" value={f.country} onChange={set("country")} maxLength={60} />
        </Field>
        <Field id="city" label="City (private, optional)">
          <Input id="city" className="h-11" value={f.city} onChange={set("city")} maxLength={60} />
        </Field>
      </div>
      <Field id="lang" label="Preferred language" hint="The app is in English for now; other languages are coming.">
        <select id="lang" value={f.preferred_language} onChange={set("preferred_language")} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}{l.available ? "" : " — coming soon"}
            </option>
          ))}
        </select>
      </Field>
      <Button className="h-11 w-full rounded-xl" disabled={busy}>
        {busy && <Loader2 className="animate-spin" />} {submitLabel}
      </Button>
    </form>
  );
}

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
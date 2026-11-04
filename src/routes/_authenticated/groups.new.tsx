import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Card } from "@/components/page";
import { Field } from "@/components/profile-form";
import { Notice } from "@/components/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, APP_CONFIG, FEES } from "@/config/app";
import { AVAILABLE_PAYOUT_METHODS, payoutAmount, formatMoney, PAYOUT_METHOD_RULES, PERIOD_LABEL, previewDueDates, formatDate, type Periodicity, type PayoutMethod } from "@/lib/equb";

export const Route = createFileRoute("/_authenticated/groups/new")({
  head: () => ({ meta: [{ title: "New circle" }, { name: "robots", content: "noindex" }] }),
  component: NewGroup,
});

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().max(1000),
  currency: z.string().regex(/^[A-Z]{3}$/),
  periodicity: z.enum(["weekly", "biweekly", "monthly"]),
  amount: z.coerce.number().positive("Amount must be positive").max(99999999),
  max_members: z.coerce.number().int().min(2).max(100),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a start date"),
  timezone: z.string().min(1),
  payout_method: z.enum(["manual", "rotating"]),
  rules: z.string().max(4000),
  eligibility: z.string().max(2000),
  missed_payment_rules: z.string().trim().min(5, "Describe what happens when a payment is missed").max(2000),
  dropout_rules: z.string().trim().min(5, "Describe what happens if a member leaves early").max(2000),
  dispute_rules: z.string().trim().min(5, "Describe how disagreements are resolved").max(2000),
  refund_rules: z.string().max(2000),
});

const sel = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

function NewGroup() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "", description: "", currency: APP_CONFIG.defaultCurrency, periodicity: "monthly" as Periodicity, amount: "100",
    max_members: "10", start_date: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    payout_method: "rotating" as PayoutMethod, rules: "",
    eligibility: "", missed_payment_rules: "", dropout_rules: "", dispute_rules: "", refund_rules: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const tzs: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [f.timezone];
  const preview = f.start_date ? previewDueDates(f.start_date, f.periodicity, Math.min(3, Number(f.max_members) || 0)) : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse(f);
    if (!p.success) return toast.error(`${p.error.issues[0].path[0]}: ${p.error.issues[0].message}`);
    const v = p.data;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_circle", { _p: v });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Circle created");
    navigate({ to: "/groups/$groupId", params: { groupId: data as string } });
  }

  return (
    <>
      <PageHeader title="Create a circle" subtitle="Private by default. Only people you invite can see it." />
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Field id="name" label="Circle name"><Input id="name" className="h-11" value={f.name} onChange={set("name")} maxLength={80} /></Field>
          <Field id="desc" label="Description (optional)"><Textarea id="desc" value={f.description} onChange={set("description")} maxLength={1000} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cur" label="Currency"><select id="cur" className={sel} value={f.currency} onChange={set("currency")}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.label}</option>)}</select></Field>
            <Field id="amt" label="Contribution per round"><Input id="amt" type="number" min="0.01" step="0.01" className="h-11" value={f.amount} onChange={set("amount")} /></Field>
            <Field id="per" label="Frequency"><select id="per" className={sel} value={f.periodicity} onChange={set("periodicity")}>{Object.entries(PERIOD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field id="max" label="Members (= number of rounds)"><Input id="max" type="number" min={2} max={100} className="h-11" value={f.max_members} onChange={set("max_members")} /></Field>
            <Field id="start" label="First due date"><Input id="start" type="date" className="h-11" value={f.start_date} onChange={set("start_date")} /></Field>
            <Field id="tz" label="Group timezone" hint="Due dates are calendar days in this timezone."><select id="tz" className={sel} value={f.timezone} onChange={set("timezone")}>{tzs.map((t) => <option key={t}>{t}</option>)}</select></Field>
          </div>
          <Field id="pm" label="Payout order"><select id="pm" className={sel} value={f.payout_method} onChange={set("payout_method")}>{AVAILABLE_PAYOUT_METHODS.map((k) => <option key={k} value={k}>{PAYOUT_METHOD_RULES[k].label}</option>)}</select></Field>
          <Notice>{PAYOUT_METHOD_RULES[f.payout_method].rule}</Notice>
          {preview.length > 0 && <p className="text-sm text-muted-foreground">First rounds: {preview.map(formatDate).join(" · ")}</p>}
          <Notice>Each member receives <b>{formatMoney(payoutAmount(Number(f.amount) || 0, Number(f.max_members) || 0), f.currency)}</b> once — exactly the pooled contributions. No interest, no bidding for earlier turns. {FEES.statusLabel} Random draw is unavailable pending review.</Notice>
          <h2 className="pt-2 font-semibold">Written terms</h2>
          <p className="-mt-2 text-sm text-muted-foreground">Invitees must read and accept these before joining. Later changes create a new version every member must re-accept.</p>
          <Field id="elig" label="Who may join (optional)"><Textarea id="elig" value={f.eligibility} onChange={set("eligibility")} maxLength={2000} /></Field>
          <Field id="miss" label="Missed payments" hint="E.g. grace period, reminders, how the group covers a gap. Late fees that grow over time are not allowed."><Textarea id="miss" value={f.missed_payment_rules} onChange={set("missed_payment_rules")} maxLength={2000} /></Field>
          <Field id="drop" label="Dropping out / leaving early" hint="Members who already received the pot keep contributing until the end."><Textarea id="drop" value={f.dropout_rules} onChange={set("dropout_rules")} maxLength={2000} /></Field>
          <Field id="disp" label="Disputes" hint="Who mediates and how decisions are made."><Textarea id="disp" value={f.dispute_rules} onChange={set("dispute_rules")} maxLength={2000} /></Field>
          <Field id="ref" label="Refunds (optional)"><Textarea id="ref" value={f.refund_rules} onChange={set("refund_rules")} maxLength={2000} /></Field>
          <Field id="rules" label="Other rules (optional)" hint="E.g. how members pay each other outside the app."><Textarea id="rules" rows={4} value={f.rules} onChange={set("rules")} maxLength={4000} /></Field>
          <Button className="h-11 w-full rounded-xl" disabled={busy}>Create circle</Button>
        </form>
      </Card>
    </>
  );
}
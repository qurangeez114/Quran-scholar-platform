import { FEES, ETHICS_STATEMENT } from "@/config/app";
import { formatDate, formatMoney, PAYOUT_METHOD_RULES, PERIOD_LABEL, type PayoutMethod, type Periodicity } from "@/lib/equb";
import { Notice } from "@/components/status";

export interface TermsSnapshot {
  contribution_amount: number;
  currency: string;
  periodicity: Periodicity;
  max_members: number;
  payout_amount: number;
  start_date: string;
  timezone: string;
  payout_method: PayoutMethod;
  fees?: string;
  eligibility?: string | null;
  dropout_rules?: string | null;
  missed_payment_rules?: string | null;
  dispute_rules?: string | null;
  refund_rules?: string | null;
  rules?: string | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Text({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{value?.trim() || "Not specified — ask the organizer before accepting."}</p>
    </div>
  );
}

export function TermsView({ t, version, publishedAt }: { t: TermsSnapshot; version: number; publishedAt?: string | null }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Terms version {version}
        {publishedAt ? ` · published ${new Date(publishedAt).toLocaleString()}` : ""}
      </p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Row label="Contribution per round" value={formatMoney(t.contribution_amount, t.currency)} />
        <Row label="Frequency" value={PERIOD_LABEL[t.periodicity]} />
        <Row label="Payout each member receives once" value={formatMoney(t.payout_amount, t.currency)} />
        <Row label="Members / rounds" value={String(t.max_members)} />
        <Row label="First due date" value={`${formatDate(t.start_date)} (${t.timezone})`} />
        <Row label="Interest" value="None" />
        <Row label="Fees" value={FEES.enabled ? "See itemized fees" : "None"} />
        <Row label="Payout order" value={PAYOUT_METHOD_RULES[t.payout_method].label} />
      </dl>
      <Notice>{PAYOUT_METHOD_RULES[t.payout_method].rule}</Notice>
      <Text label="Who may join (eligibility)" value={t.eligibility} />
      <Text label="Missed payments" value={t.missed_payment_rules} />
      <Text label="Dropping out / leaving early" value={t.dropout_rules} />
      <Text label="Disputes" value={t.dispute_rules} />
      <Text label="Refunds" value={t.refund_rules} />
      {t.rules && <Text label="Other rules" value={t.rules} />}
      <p className="rounded-xl bg-muted p-3 text-xs text-muted-foreground">{ETHICS_STATEMENT}</p>
    </div>
  );
}
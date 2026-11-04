import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/page";
import { Notice } from "@/components/status";
import { supabase } from "@/integrations/supabase/client";

/**
 * Staging-only feature until db-review migration 0004 is applied.
 * The Supabase generated types must be refreshed from staging before release.
 */
type ConsentRpc = (name: "consent_to_verify" | "withdraw_verifier_consent", args: { _group: string }) =>
  PromiseLike<{ error: { message: string } | null }>;

export function VerifierConsentPanel({
  groupId, uid, isOrganizer,
}: { groupId: string; uid: string; isOrganizer: boolean }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const consentQuery = useQuery({
    queryKey: ["verifier-consent", groupId, uid],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_members").select("*")
        .eq("group_id", groupId).eq("user_id", uid).single();
      if (error) throw error;
      // verifier_consent_at is introduced in review migration 0004.
      return (data as typeof data & { verifier_consent_at?: string | null }).verifier_consent_at ?? null;
    },
  });
  const consented = Boolean(consentQuery.data);

  async function updateConsent(consent: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      const rpc = supabase.rpc as unknown as ConsentRpc;
      const { error } = await rpc(consent ? "consent_to_verify" : "withdraw_verifier_consent", { _group: groupId });
      if (error) throw error;
      toast.success(consent ? "You can now independently verify other members' contributions." : "Verifier consent withdrawn.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["verifier-consent", groupId, uid] }),
        qc.invalidateQueries({ queryKey: ["group", groupId] }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return <Card className="space-y-3">
    <h2 className="font-semibold">Independent payment verification</h2>
    <p className="text-sm text-muted-foreground">
      Members confirm their own contribution. A different organizer or a member who has voluntarily opted in verifies that contribution separately.
      You can never verify your own payment.
    </p>
    {isOrganizer && <Notice tone="warning">An organizer's own contribution requires verification by another member who has opted in. Your organizer role does not bypass this rule.</Notice>}
    {consentQuery.isLoading ? <p className="text-sm text-muted-foreground">Checking consent…</p> :
      consentQuery.error ? <Notice tone="warning">Consent status is unavailable. These controls require the reviewed lifecycle migration on staging. <button className="underline" onClick={() => void consentQuery.refetch()}>Retry</button>.</Notice> :
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">{isOrganizer ? "Organizer verification permission is active for other members." : consented ? "You opted in to verify other members' payments." : "You have not opted in to verify payments."}</span>
        {!isOrganizer && <Button type="button" variant={consented ? "outline" : "default"} disabled={busy} onClick={() => void updateConsent(!consented)}>
          {busy ? "Saving…" : consented ? "Withdraw verifier consent" : "Opt in as verifier"}
        </Button>}
      </div>}
  </Card>;
}

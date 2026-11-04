// Data access for the Equb module. Reads go through RLS; every write goes
// through a SECURITY DEFINER RPC that re-checks membership/role server-side.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Group = Database["public"]["Tables"]["equb_groups"]["Row"];
export type Round = Database["public"]["Tables"]["equb_rounds"]["Row"];
export type Contribution = Database["public"]["Tables"]["contributions"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Invite = Database["public"]["Tables"]["group_invites"]["Row"];
export type ActivityItem = Database["public"]["Tables"]["activity_log"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type Member = Database["public"]["Functions"]["get_group_members"]["Returns"][number];

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong";
}

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

export async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export const meQuery = () =>
  queryOptions({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      const profile = await must(supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle());
      return { user: data.user, profile };
    },
  });

export const dashboardQuery = () =>
  queryOptions({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const uid = await getUserId();
      const memberships = await must(supabase.from("group_members").select("group_id, role").eq("user_id", uid));
      const ids = memberships.map((m) => m.group_id);
      if (!ids.length) return { uid, groups: [], rounds: [], contributions: [], members: [], memberships };
      const [groups, rounds, contributions, members] = await Promise.all([
        must(supabase.from("equb_groups").select("*").in("id", ids).order("created_at", { ascending: false })),
        must(supabase.from("equb_rounds").select("*").in("group_id", ids).order("round_number")),
        must(supabase.from("contributions").select("*").in("group_id", ids)),
        must(supabase.from("group_members").select("group_id, user_id").in("group_id", ids)),
      ]);
      return { uid, groups, rounds, contributions, members, memberships };
    },
  });

export const groupQuery = (groupId: string) =>
  queryOptions({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const uid = await getUserId();
      const group = await must(supabase.from("equb_groups").select("*").eq("id", groupId).maybeSingle());
      if (!group) return null;
      const [members, rounds, contributions, activity, terms, acceptances, memberConsents, missed, disputes, terminations, termConsents] = await Promise.all([
        must(supabase.rpc("get_group_members", { _group: groupId })),
        must(supabase.from("equb_rounds").select("*").eq("group_id", groupId).order("round_number")),
        must(supabase.from("contributions").select("*").eq("group_id", groupId)),
        must(
          supabase
            .from("activity_log")
            .select("*")
            .eq("group_id", groupId)
            .order("created_at", { ascending: false })
            .limit(200),
        ),
        must(supabase.from("group_terms").select("*").eq("group_id", groupId).order("version", { ascending: false })),
        must(supabase.from("term_acceptances").select("*").eq("group_id", groupId)),
        must(supabase.from("group_members").select("user_id, verifier_consent_at").eq("group_id", groupId)),
        must(supabase.from("missed_contributions").select("*").eq("group_id", groupId).order("created_at", { ascending: false })),
        must(supabase.from("disputes").select("*").eq("group_id", groupId).order("opened_at", { ascending: false })),
        must(supabase.from("group_terminations").select("*").eq("group_id", groupId)),
        must(supabase.from("termination_consents").select("user_id").eq("group_id", groupId)),
      ]);
      // Reconciliation is only meaningful once money has been scheduled; the RPC also re-checks membership.
      const reconciliation = group.status === "active" || group.status === "completed" || group.status === "terminated"
        ? await must(supabase.rpc("circle_reconciliation", { _group: groupId }))
        : [];
      const me = members.find((m) => m.user_id === uid);
      const accepted = new Set(acceptances.filter((a) => a.version === group.terms_version).map((a) => a.user_id));
      const consentIds = new Set(memberConsents.filter((m) => m.verifier_consent_at).map((m) => m.user_id));
      const termConsentIds = new Set(termConsents.map((t) => t.user_id));
      return {
        uid, group, members, rounds, contributions, activity, terms, acceptances, accepted,
        isOrganizer: me?.role === "organizer", consentIds, missed, disputes, terminations, termConsentIds, reconciliation,
      };
    },
  });

export const invitesQuery = (groupId: string) =>
  queryOptions({
    queryKey: ["invites", groupId],
    queryFn: () =>
      must(
        supabase.from("group_invites").select("*").eq("group_id", groupId).order("created_at", { ascending: false }),
      ),
  });

export const notificationsQuery = () =>
  queryOptions({
    queryKey: ["notifications"],
    queryFn: () =>
      must(supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)),
  });
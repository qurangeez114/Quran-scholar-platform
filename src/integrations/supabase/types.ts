export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          entity_id: string | null;
          entity_type: string | null;
          group_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          entity_id?: string | null;
          entity_type?: string | null;
          group_id: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          entity_id?: string | null;
          entity_type?: string | null;
          group_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      contributions: {
        Row: {
          amount: number;
          group_id: string;
          id: string;
          note: string | null;
          organizer_confirmed_at: string | null;
          organizer_confirmed_by: string | null;
          payer_confirmed_at: string | null;
          payer_confirmed_by: string | null;
          payer_id: string;
          recorded_at: string;
          recorded_by: string;
          round_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          group_id: string;
          id?: string;
          note?: string | null;
          organizer_confirmed_at?: string | null;
          organizer_confirmed_by?: string | null;
          payer_confirmed_at?: string | null;
          payer_confirmed_by?: string | null;
          payer_id: string;
          recorded_at?: string;
          recorded_by: string;
          round_id: string;
        };
        Update: {
          amount?: number;
          group_id?: string;
          id?: string;
          note?: string | null;
          organizer_confirmed_at?: string | null;
          organizer_confirmed_by?: string | null;
          payer_confirmed_at?: string | null;
          payer_confirmed_by?: string | null;
          payer_id?: string;
          recorded_at?: string;
          recorded_by?: string;
          round_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contributions_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contributions_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "equb_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      dispute_events: {
        Row: {
          actor_id: string;
          body: string | null;
          created_at: string;
          dispute_id: string;
          id: string;
          kind: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id: string;
          body?: string | null;
          created_at?: string;
          dispute_id: string;
          id?: string;
          kind: string;
        };
        Update: {
          actor_id?: string;
          body?: string | null;
          created_at?: string;
          dispute_id?: string;
          id?: string;
          kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dispute_events_dispute_id_fkey";
            columns: ["dispute_id"];
            isOneToOne: false;
            referencedRelation: "disputes";
            referencedColumns: ["id"];
          },
        ];
      };
      disputes: {
        Row: {
          closed_at: string | null;
          contribution_id: string;
          group_id: string;
          id: string;
          opened_at: string;
          opened_by: string;
          reason: string;
          resolution: string | null;
          resolved_by: string | null;
          round_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          closed_at?: string | null;
          contribution_id: string;
          group_id: string;
          id?: string;
          opened_at?: string;
          opened_by: string;
          reason: string;
          resolution?: string | null;
          resolved_by?: string | null;
          round_id: string;
          status?: string;
        };
        Update: {
          closed_at?: string | null;
          contribution_id?: string;
          group_id?: string;
          id?: string;
          opened_at?: string;
          opened_by?: string;
          reason?: string;
          resolution?: string | null;
          resolved_by?: string | null;
          round_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disputes_contribution_id_fkey";
            columns: ["contribution_id"];
            isOneToOne: false;
            referencedRelation: "contributions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "disputes_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "disputes_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "equb_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      equb_groups: {
        Row: {
          contribution_amount: number;
          created_at: string;
          currency: string;
          description: string | null;
          dispute_rules: string | null;
          dropout_rules: string | null;
          eligibility: string | null;
          fees_enabled: boolean;
          id: string;
          max_members: number;
          missed_payment_rules: string | null;
          name: string;
          organizer_id: string;
          payout_method: Database["public"]["Enums"]["equb_payout_method"];
          periodicity: Database["public"]["Enums"]["equb_periodicity"];
          refund_rules: string | null;
          rules: string | null;
          start_date: string;
          status: Database["public"]["Enums"]["equb_group_status"];
          terms_version: number;
          timezone: string;
          visibility: string;
        };
        ComputedFields: never;
        Insert: {
          contribution_amount: number;
          created_at?: string;
          currency: string;
          description?: string | null;
          dispute_rules?: string | null;
          dropout_rules?: string | null;
          eligibility?: string | null;
          fees_enabled?: boolean;
          id?: string;
          max_members: number;
          missed_payment_rules?: string | null;
          name: string;
          organizer_id: string;
          payout_method?: Database["public"]["Enums"]["equb_payout_method"];
          periodicity: Database["public"]["Enums"]["equb_periodicity"];
          refund_rules?: string | null;
          rules?: string | null;
          start_date: string;
          status?: Database["public"]["Enums"]["equb_group_status"];
          terms_version?: number;
          timezone?: string;
          visibility?: string;
        };
        Update: {
          contribution_amount?: number;
          created_at?: string;
          currency?: string;
          description?: string | null;
          dispute_rules?: string | null;
          dropout_rules?: string | null;
          eligibility?: string | null;
          fees_enabled?: boolean;
          id?: string;
          max_members?: number;
          missed_payment_rules?: string | null;
          name?: string;
          organizer_id?: string;
          payout_method?: Database["public"]["Enums"]["equb_payout_method"];
          periodicity?: Database["public"]["Enums"]["equb_periodicity"];
          refund_rules?: string | null;
          rules?: string | null;
          start_date?: string;
          status?: Database["public"]["Enums"]["equb_group_status"];
          terms_version?: number;
          timezone?: string;
          visibility?: string;
        };
        Relationships: [];
      };
      equb_rounds: {
        Row: {
          created_at: string;
          due_date: string;
          group_id: string;
          id: string;
          payout_note: string | null;
          payout_recorded_at: string | null;
          payout_recorded_by: string | null;
          recipient_confirmed_at: string | null;
          recipient_id: string | null;
          round_number: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          due_date: string;
          group_id: string;
          id?: string;
          payout_note?: string | null;
          payout_recorded_at?: string | null;
          payout_recorded_by?: string | null;
          recipient_confirmed_at?: string | null;
          recipient_id?: string | null;
          round_number: number;
        };
        Update: {
          created_at?: string;
          due_date?: string;
          group_id?: string;
          id?: string;
          payout_note?: string | null;
          payout_recorded_at?: string | null;
          payout_recorded_by?: string | null;
          recipient_confirmed_at?: string | null;
          recipient_id?: string | null;
          round_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "equb_rounds_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_invites: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          group_id: string;
          id: string;
          max_uses: number;
          revoked: boolean;
          uses: number;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          expires_at: string;
          group_id: string;
          id?: string;
          max_uses?: number;
          revoked?: boolean;
          uses?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          group_id?: string;
          id?: string;
          max_uses?: number;
          revoked?: boolean;
          uses?: number;
        };
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          id: string;
          joined_at: string;
          payout_position: number | null;
          role: Database["public"]["Enums"]["equb_role"];
          user_id: string;
          verifier_consent_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          group_id: string;
          id?: string;
          joined_at?: string;
          payout_position?: number | null;
          role?: Database["public"]["Enums"]["equb_role"];
          user_id: string;
          verifier_consent_at?: string | null;
        };
        Update: {
          group_id?: string;
          id?: string;
          joined_at?: string;
          payout_position?: number | null;
          role?: Database["public"]["Enums"]["equb_role"];
          user_id?: string;
          verifier_consent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_terminations: {
        Row: {
          effective_at: string | null;
          group_id: string;
          reason: string;
          requested_at: string;
          requested_by: string;
        };
        ComputedFields: never;
        Insert: {
          effective_at?: string | null;
          group_id: string;
          reason: string;
          requested_at?: string;
          requested_by: string;
        };
        Update: {
          effective_at?: string | null;
          group_id?: string;
          reason?: string;
          requested_at?: string;
          requested_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_terminations_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: true;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_terms: {
        Row: {
          change_summary: string | null;
          created_at: string;
          created_by: string;
          group_id: string;
          id: string;
          terms: NonNullable<Json>;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          change_summary?: string | null;
          created_at?: string;
          created_by: string;
          group_id: string;
          id?: string;
          terms: NonNullable<Json>;
          version: number;
        };
        Update: {
          change_summary?: string | null;
          created_at?: string;
          created_by?: string;
          group_id?: string;
          id?: string;
          terms?: NonNullable<Json>;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "group_terms_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      invite_responses: {
        Row: {
          created_at: string;
          id: string;
          invite_id: string;
          response: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          invite_id: string;
          response: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invite_id?: string;
          response?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invite_responses_invite_id_fkey";
            columns: ["invite_id"];
            isOneToOne: false;
            referencedRelation: "group_invites";
            referencedColumns: ["id"];
          },
        ];
      };
      missed_contributions: {
        Row: {
          created_at: string;
          detected_on: string;
          due_date: string;
          group_id: string;
          id: string;
          payer_id: string;
          resolved_at: string | null;
          round_id: string;
          round_number: number;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          detected_on: string;
          due_date: string;
          group_id: string;
          id?: string;
          payer_id: string;
          resolved_at?: string | null;
          round_id: string;
          round_number: number;
          status?: string;
        };
        Update: {
          created_at?: string;
          detected_on?: string;
          due_date?: string;
          group_id?: string;
          id?: string;
          payer_id?: string;
          resolved_at?: string | null;
          round_id?: string;
          round_number?: number;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "missed_contributions_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "missed_contributions_round_id_fkey";
            columns: ["round_id"];
            isOneToOne: false;
            referencedRelation: "equb_rounds";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          group_id: string | null;
          id: string;
          kind: string;
          link: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body?: string | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          kind: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          group_id?: string | null;
          id?: string;
          kind?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          city: string | null;
          country: string | null;
          created_at: string;
          display_name: string;
          full_name: string | null;
          id: string;
          onboarded: boolean;
          preferred_language: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string;
          full_name?: string | null;
          id: string;
          onboarded?: boolean;
          preferred_language?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string;
          full_name?: string | null;
          id?: string;
          onboarded?: boolean;
          preferred_language?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      term_acceptances: {
        Row: {
          accepted_at: string;
          group_id: string;
          id: string;
          terms_id: string;
          user_id: string;
          version: number;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string;
          group_id: string;
          id?: string;
          terms_id: string;
          user_id: string;
          version: number;
        };
        Update: {
          accepted_at?: string;
          group_id?: string;
          id?: string;
          terms_id?: string;
          user_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "term_acceptances_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "term_acceptances_terms_id_fkey";
            columns: ["terms_id"];
            isOneToOne: false;
            referencedRelation: "group_terms";
            referencedColumns: ["id"];
          },
        ];
      };
      termination_consents: {
        Row: {
          consented_at: string;
          group_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          consented_at?: string;
          group_id: string;
          user_id: string;
        };
        Update: {
          consented_at?: string;
          group_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "termination_consents_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "equb_groups";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      _detect_missed: {
        Args: { _as_of: string; _group: string };
        Returns: number;
      };
      _display_name: { Args: { _user: string }; Returns: string };
      _effect_termination: { Args: { _group: string }; Returns: boolean };
      _is_dispute_party: {
        Args: { _contribution: string; _user: string };
        Returns: boolean;
      };
      _is_verifier: {
        Args: { _group: string; _user: string };
        Returns: boolean;
      };
      _log: {
        Args: {
          _action: string;
          _details?: Json;
          _eid: string;
          _etype: string;
          _group: string;
        };
        Returns: undefined;
      };
      _notify: {
        Args: {
          _body: string;
          _group: string;
          _kind: string;
          _link: string;
          _title: string;
          _user: string;
        };
        Returns: undefined;
      };
      _notify_organizers: {
        Args: {
          _body: string;
          _group: string;
          _kind: string;
          _link: string;
          _title: string;
        };
        Returns: undefined;
      };
      _publish_terms: {
        Args: { _group: string; _summary: string };
        Returns: number;
      };
      _terms_snapshot: { Args: { _group: string }; Returns: Json };
      accept_current_terms: {
        Args: { _group: string; _version: number };
        Returns: undefined;
      };
      accept_invite: { Args: { _code: string }; Returns: string };
      accept_invite_with_terms: {
        Args: { _code: string; _version: number };
        Returns: string;
      };
      add_dispute_note: {
        Args: { _body: string; _dispute: string };
        Returns: undefined;
      };
      circle_reconciliation: {
        Args: { _group: string };
        Returns: {
          contributions_confirmed: number;
          contributions_expected: number;
          display_name: string;
          net_position: number;
          payout_confirmed: number;
          payout_expected: number;
          user_id: string;
        }[];
      };
      complete_circle: { Args: { _group: string }; Returns: undefined };
      confirm_contribution: { Args: { _contribution: string }; Returns: Json };
      confirm_payout: { Args: { _round: string }; Returns: undefined };
      consent_termination: { Args: { _group: string }; Returns: boolean };
      consent_to_verify: { Args: { _group: string }; Returns: undefined };
      create_circle: { Args: { _p: Json }; Returns: string };
      create_group: {
        Args: {
          _amount: number;
          _currency: string;
          _description: string;
          _max_members: number;
          _name: string;
          _payout_method: Database["public"]["Enums"]["equb_payout_method"];
          _periodicity: Database["public"]["Enums"]["equb_periodicity"];
          _rules: string;
          _start_date: string;
          _timezone: string;
        };
        Returns: string;
      };
      create_invite: {
        Args: { _days?: number; _group: string; _max_uses?: number };
        Returns: string;
      };
      decline_invite: { Args: { _code: string }; Returns: undefined };
      generate_schedule: { Args: { _group: string }; Returns: number };
      get_group_members: {
        Args: { _group: string };
        Returns: {
          avatar_url: string;
          display_name: string;
          joined_at: string;
          payout_position: number;
          role: Database["public"]["Enums"]["equb_role"];
          user_id: string;
        }[];
      };
      has_accepted_current_terms: {
        Args: { _group: string; _user: string };
        Returns: boolean;
      };
      is_group_member: {
        Args: { _group: string; _user: string };
        Returns: boolean;
      };
      is_group_organizer: {
        Args: { _group: string; _user: string };
        Returns: boolean;
      };
      is_my_group: { Args: { _group: string }; Returns: boolean };
      is_my_organizer: { Args: { _group: string }; Returns: boolean };
      open_dispute: {
        Args: { _contribution: string; _reason: string };
        Returns: string;
      };
      preview_invite: { Args: { _code: string }; Returns: Json };
      record_contribution: {
        Args: {
          _amount: number;
          _note: string;
          _payer: string;
          _round: string;
        };
        Returns: string;
      };
      record_payout: {
        Args: { _note: string; _round: string };
        Returns: undefined;
      };
      refresh_missed_contributions: {
        Args: { _group: string };
        Returns: number;
      };
      request_termination: {
        Args: { _group: string; _reason: string };
        Returns: boolean;
      };
      resolve_dispute: {
        Args: { _dispute: string; _resolution: string };
        Returns: undefined;
      };
      revoke_invite: { Args: { _invite: string }; Returns: undefined };
      set_payout_order: {
        Args: { _group: string; _users: string[] };
        Returns: undefined;
      };
      update_group: {
        Args: {
          _description: string;
          _group: string;
          _name: string;
          _rules: string;
        };
        Returns: undefined;
      };
      update_terms: {
        Args: { _group: string; _p: Json; _summary: string };
        Returns: number;
      };
      withdraw_dispute: { Args: { _dispute: string }; Returns: undefined };
      withdraw_verifier_consent: {
        Args: { _group: string };
        Returns: undefined;
      };
    };
    Enums: {
      equb_group_status: "forming" | "active" | "completed" | "terminated";
      equb_payout_method: "manual" | "rotating" | "random";
      equb_periodicity: "weekly" | "biweekly" | "monthly";
      equb_role: "organizer" | "participant";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      equb_group_status: ["forming", "active", "completed", "terminated"],
      equb_payout_method: ["manual", "rotating", "random"],
      equb_periodicity: ["weekly", "biweekly", "monthly"],
      equb_role: ["organizer", "participant"],
    },
  },
} as const;

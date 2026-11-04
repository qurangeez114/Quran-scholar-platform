export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string | null
          group_id: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          group_id: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string | null
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equb_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          amount: number
          group_id: string
          id: string
          note: string | null
          organizer_confirmed_at: string | null
          payer_confirmed_at: string | null
          payer_id: string
          recorded_at: string
          recorded_by: string
          round_id: string
        }
        Insert: {
          amount: number
          group_id: string
          id?: string
          note?: string | null
          organizer_confirmed_at?: string | null
          payer_confirmed_at?: string | null
          payer_id: string
          recorded_at?: string
          recorded_by: string
          round_id: string
        }
        Update: {
          amount?: number
          group_id?: string
          id?: string
          note?: string | null
          organizer_confirmed_at?: string | null
          payer_confirmed_at?: string | null
          payer_id?: string
          recorded_at?: string
          recorded_by?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equb_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "equb_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      equb_groups: {
        Row: {
          contribution_amount: number
          created_at: string
          currency: string
          description: string | null
          dispute_rules: string | null
          dropout_rules: string | null
          eligibility: string | null
          fees_enabled: boolean
          id: string
          max_members: number
          missed_payment_rules: string | null
          name: string
          organizer_id: string
          payout_method: Database["public"]["Enums"]["equb_payout_method"]
          periodicity: Database["public"]["Enums"]["equb_periodicity"]
          refund_rules: string | null
          rules: string | null
          start_date: string
          status: Database["public"]["Enums"]["equb_group_status"]
          terms_version: number
          timezone: string
          visibility: string
        }
        Insert: {
          contribution_amount: number
          created_at?: string
          currency: string
          description?: string | null
          dispute_rules?: string | null
          dropout_rules?: string | null
          eligibility?: string | null
          fees_enabled?: boolean
          id?: string
          max_members: number
          missed_payment_rules?: string | null
          name: string
          organizer_id: string
          payout_method?: Database["public"]["Enums"]["equb_payout_method"]
          periodicity: Database["public"]["Enums"]["equb_periodicity"]
          refund_rules?: string | null
          rules?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["equb_group_status"]
          terms_version?: number
          timezone?: string
          visibility?: string
        }
        Update: {
          contribution_amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          dispute_rules?: string | null
          dropout_rules?: string | null
          eligibility?: string | null
          fees_enabled?: boolean
          id?: string
          max_members?: number
          missed_payment_rules?: string | null
          name?: string
          organizer_id?: string
          payout_method?: Database["public"]["Enums"]["equb_payout_method"]
          periodicity?: Database["public"]["Enums"]["equb_periodicity"]
          refund_rules?: string | null
          rules?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["equb_group_status"]
          terms_version?: number
          timezone?: string
          visibility?: string
        }
        Relationships: []
      }
      equb_rounds: {
        Row: {
          created_at: string
          due_date: string
          group_id: string
          id: string
          payout_note: string | null
          payout_recorded_at: string | null
          payout_recorded_by: string | null
          recipient_confirmed_at: string | null
          recipient_id: string | null
          round_number: number
        }
        Insert: {
          created_at?: string
          due_date: string
          group_id: string
          id?: string
          payout_note?: string | null
          payout_recorded_at?: string | null
          payout_recorded_by?: string | null
          recipient_confirmed_at?: string | null
          recipient_id?: string | null
          round_number: number
        }
        Update: {
          created_at?: string
          due_date?: string
          group_id?: string
          id?: string
          payout_note?: string | null
          payout_recorded_at?: string | null
          payout_recorded_by?: string | null
          recipient_confirmed_at?: string | null
          recipient_id?: string | null
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "equb_rounds_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equb_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          group_id: string
          id: string
          max_uses: number
          revoked: boolean
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          group_id: string
          id?: string
          max_uses?: number
          revoked?: boolean
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          group_id?: string
          id?: string
          max_uses?: number
          revoked?: boolean
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equb_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          payout_position: number | null
          role: Database["public"]["Enums"]["equb_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          payout_position?: number | null
          role?: Database["public"]["Enums"]["equb_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          payout_position?: number | null
          role?: Database["public"]["Enums"]["equb_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equb_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_terms: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string
          group_id: string
          id: string
          terms: Json
          version: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          terms: Json
          version: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          terms?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_terms_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equb_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_responses: {
        Row: {
          created_at: string
          id: string
          invite_id: string
          response: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_id: string
          response: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_id?: string
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_responses_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "group_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          group_id: string | null
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equb_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string
          full_name: string | null
          id: string
          onboarded: boolean
          preferred_language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          full_name?: string | null
          id: string
          onboarded?: boolean
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          full_name?: string | null
          id?: string
          onboarded?: boolean
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      term_acceptances: {
        Row: {
          accepted_at: string
          group_id: string
          id: string
          terms_id: string
          user_id: string
          version: number
        }
        Insert: {
          accepted_at?: string
          group_id: string
          id?: string
          terms_id: string
          user_id: string
          version: number
        }
        Update: {
          accepted_at?: string
          group_id?: string
          id?: string
          terms_id?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "term_acceptances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equb_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "term_acceptances_terms_id_fkey"
            columns: ["terms_id"]
            isOneToOne: false
            referencedRelation: "group_terms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _display_name: { Args: { _user: string }; Returns: string }
      _log: {
        Args: {
          _action: string
          _details?: Json
          _eid: string
          _etype: string
          _group: string
        }
        Returns: undefined
      }
      _notify: {
        Args: {
          _body: string
          _group: string
          _kind: string
          _link: string
          _title: string
          _user: string
        }
        Returns: undefined
      }
      _notify_organizers: {
        Args: {
          _body: string
          _group: string
          _kind: string
          _link: string
          _title: string
        }
        Returns: undefined
      }
      _publish_terms: {
        Args: { _group: string; _summary: string }
        Returns: number
      }
      _terms_snapshot: { Args: { _group: string }; Returns: Json }
      accept_current_terms: {
        Args: { _group: string; _version: number }
        Returns: undefined
      }
      accept_invite: { Args: { _code: string }; Returns: string }
      accept_invite_with_terms: {
        Args: { _code: string; _version: number }
        Returns: string
      }
      confirm_contribution: { Args: { _contribution: string }; Returns: Json }
      confirm_payout: { Args: { _round: string }; Returns: undefined }
      create_circle: { Args: { _p: Json }; Returns: string }
      create_group: {
        Args: {
          _amount: number
          _currency: string
          _description: string
          _max_members: number
          _name: string
          _payout_method: Database["public"]["Enums"]["equb_payout_method"]
          _periodicity: Database["public"]["Enums"]["equb_periodicity"]
          _rules: string
          _start_date: string
          _timezone: string
        }
        Returns: string
      }
      create_invite: {
        Args: { _days?: number; _group: string; _max_uses?: number }
        Returns: string
      }
      decline_invite: { Args: { _code: string }; Returns: undefined }
      generate_schedule: { Args: { _group: string }; Returns: number }
      get_group_members: {
        Args: { _group: string }
        Returns: {
          avatar_url: string
          display_name: string
          joined_at: string
          payout_position: number
          role: Database["public"]["Enums"]["equb_role"]
          user_id: string
        }[]
      }
      has_accepted_current_terms: {
        Args: { _group: string; _user: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group: string; _user: string }
        Returns: boolean
      }
      is_group_organizer: {
        Args: { _group: string; _user: string }
        Returns: boolean
      }
      preview_invite: { Args: { _code: string }; Returns: Json }
      record_contribution: {
        Args: { _amount: number; _note: string; _payer: string; _round: string }
        Returns: string
      }
      record_payout: {
        Args: { _note: string; _round: string }
        Returns: undefined
      }
      revoke_invite: { Args: { _invite: string }; Returns: undefined }
      set_payout_order: {
        Args: { _group: string; _users: string[] }
        Returns: undefined
      }
      update_group: {
        Args: {
          _description: string
          _group: string
          _name: string
          _rules: string
        }
        Returns: undefined
      }
      update_terms: {
        Args: { _group: string; _p: Json; _summary: string }
        Returns: number
      }
    }
    Enums: {
      equb_group_status: "forming" | "active" | "completed"
      equb_payout_method: "manual" | "rotating" | "random"
      equb_periodicity: "weekly" | "biweekly" | "monthly"
      equb_role: "organizer" | "participant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      equb_group_status: ["forming", "active", "completed"],
      equb_payout_method: ["manual", "rotating", "random"],
      equb_periodicity: ["weekly", "biweekly", "monthly"],
      equb_role: ["organizer", "participant"],
    },
  },
} as const
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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bug_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          image_urls: string[]
          page_url: string | null
          reported_by: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image_urls?: string[]
          page_url?: string | null
          reported_by: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_urls?: string[]
          page_url?: string | null
          reported_by?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          notification_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template: string
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status: string
          subject: string
          template: string
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_item_shares: {
        Row: {
          added_at: string
          experiment_item_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          experiment_item_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          experiment_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_item_shares_experiment_item_id_fkey"
            columns: ["experiment_item_id"]
            isOneToOne: false
            referencedRelation: "experiment_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_item_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_items: {
        Row: {
          added_by: string
          experiment_id: string
          id: string
          inventory_item_id: string
          quantity: number
          reserved_at: string
          returned_at: string | null
          sharing_mode: string
          status: string
        }
        Insert: {
          added_by: string
          experiment_id: string
          id?: string
          inventory_item_id: string
          quantity: number
          reserved_at?: string
          returned_at?: string | null
          sharing_mode: string
          status?: string
        }
        Update: {
          added_by?: string
          experiment_id?: string
          id?: string
          inventory_item_id?: string
          quantity?: number
          reserved_at?: string
          returned_at?: string | null
          sharing_mode?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_items_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_legal_acceptance: {
        Row: {
          accepted_at: string
          accepted_by: string
          experiment_id: string
          id: string
          ip_address: unknown
          policy_version: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_by: string
          experiment_id: string
          id?: string
          ip_address?: unknown
          policy_version?: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_by?: string
          experiment_id?: string
          id?: string
          ip_address?: unknown
          policy_version?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "experiment_legal_acceptance_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_legal_acceptance_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: true
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_participants: {
        Row: {
          experiment_id: string
          id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          experiment_id: string
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source: string
          status: string
          user_id: string
        }
        Update: {
          experiment_id?: string
          id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_participants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_participants_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_sessions: {
        Row: {
          created_at: string
          created_by: string
          ended_at_actual: string | null
          ended_at_planned: string
          experiment_id: string
          id: string
          started_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ended_at_actual?: string | null
          ended_at_planned: string
          experiment_id: string
          id?: string
          started_at: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at_actual?: string | null
          ended_at_planned?: string
          experiment_id?: string
          id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiment_sessions_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          fecha_fin_real: string | null
          fecha_fin_tentativa: string | null
          fecha_inicio: string | null
          id: string
          owner_id: string
          photo_url: string | null
          stage: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          fecha_fin_real?: string | null
          fecha_fin_tentativa?: string | null
          fecha_inicio?: string | null
          id?: string
          owner_id: string
          photo_url?: string | null
          stage?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          fecha_fin_real?: string | null
          fecha_fin_tentativa?: string | null
          fecha_inicio?: string | null
          id?: string
          owner_id?: string
          photo_url?: string | null
          stage?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "experiments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          location_id: string
          name: string
          quantity_total: number
          reference: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location_id: string
          name: string
          quantity_total: number
          reference?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location_id?: string
          name?: string
          quantity_total?: number
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          label: string
          number: number
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          number: number
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          number?: number
          type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          payload: Json
          related_experiment_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          payload: Json
          related_experiment_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          payload?: Json
          related_experiment_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_experiment_id_fkey"
            columns: ["related_experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          career: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          member_status: string
          role: string
          updated_at: string
        }
        Insert: {
          career?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          member_status: string
          role?: string
          updated_at?: string
        }
        Update: {
          career?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          member_status?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_inventory_availability: {
        Args: never
        Returns: {
          inventory_item_id: string
          quantity_available: number
          quantity_reserved: number
          quantity_total: number
        }[]
      }
      is_experiment_owner: {
        Args: { p_experiment_id: string }
        Returns: boolean
      }
      is_experiment_owner_or_creator: {
        Args: { p_experiment_id: string }
        Returns: boolean
      }
      is_experiment_participant: {
        Args: { p_experiment_id: string }
        Returns: boolean
      }
      set_item_image: {
        Args: { image_url: string; item_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

// Generated types from Supabase schema
// Run: npx supabase gen types typescript > src/lib/supabase/types.ts

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          email: string
          role: string
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email: string
          role?: string
          created_at?: string
        }
        Update: {
          full_name?: string | null
          role?: string
        }
      }
      locations: {
        Row: {
          id: string
          type: "cajon" | "armario"
          number: number
          label: string
          created_at: string
        }
        Insert: {
          id?: string
          type: "cajon" | "armario"
          number: number
          label: string
          created_at?: string
        }
        Update: {
          type?: "cajon" | "armario"
          number?: number
          label?: string
        }
      }
      inventory_items: {
        Row: {
          id: string
          name: string
          description: string | null
          reference: string | null
          quantity_total: number
          quantity_reserved: number
          location_id: string
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          reference?: string | null
          quantity_total: number
          quantity_reserved?: number
          location_id: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          reference?: string | null
          quantity_total?: number
          quantity_reserved?: number
          location_id?: string
          image_url?: string | null
          updated_at?: string
        }
      }
      experiments: {
        Row: {
          id: string
          title: string
          description: string | null
          owner_id: string
          created_by: string
          status: "draft" | "in_progress" | "finished" | "cancelled"
          fecha_inicio: string | null
          fecha_fin_tentativa: string | null
          fecha_fin_real: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          owner_id: string
          created_by: string
          status?: "draft" | "in_progress" | "finished" | "cancelled"
          fecha_inicio?: string | null
          fecha_fin_tentativa?: string | null
          fecha_fin_real?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          owner_id?: string
          status?: "draft" | "in_progress" | "finished" | "cancelled"
          fecha_inicio?: string | null
          fecha_fin_tentativa?: string | null
          fecha_fin_real?: string | null
          updated_at?: string
        }
      }
      experiment_sessions: {
        Row: {
          id: string
          experiment_id: string
          started_at: string
          ended_at_planned: string
          ended_at_actual: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          experiment_id: string
          started_at: string
          ended_at_planned: string
          ended_at_actual?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          ended_at_actual?: string | null
        }
      }
      experiment_participants: {
        Row: {
          id: string
          experiment_id: string
          user_id: string
          status: "pending" | "approved" | "rejected"
          source: "invited_by_owner" | "requested_by_user"
          requested_at: string
          resolved_by: string | null
          resolved_at: string | null
        }
        Insert: {
          id?: string
          experiment_id: string
          user_id: string
          status: "pending" | "approved" | "rejected"
          source: "invited_by_owner" | "requested_by_user"
          requested_at?: string
          resolved_by?: string | null
          resolved_at?: string | null
        }
        Update: {
          status?: "pending" | "approved" | "rejected"
          resolved_by?: string | null
          resolved_at?: string | null
        }
      }
      experiment_items: {
        Row: {
          id: string
          experiment_id: string
          inventory_item_id: string
          quantity: number
          sharing_mode: "individual" | "compartido"
          status: "active" | "returned"
          added_by: string
          reserved_at: string
          returned_at: string | null
        }
        Insert: {
          id?: string
          experiment_id: string
          inventory_item_id: string
          quantity: number
          sharing_mode: "individual" | "compartido"
          status?: "active" | "returned"
          added_by: string
          reserved_at?: string
          returned_at?: string | null
        }
        Update: {
          status?: "active" | "returned"
          returned_at?: string | null
        }
      }
      experiment_item_shares: {
        Row: {
          experiment_item_id: string
          user_id: string
          added_at: string
        }
        Insert: {
          experiment_item_id: string
          user_id: string
          added_at?: string
        }
        Update: {}
      }
      experiment_legal_acceptance: {
        Row: {
          id: string
          experiment_id: string
          accepted_by: string
          accepted_at: string
          policy_version: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          experiment_id: string
          accepted_by: string
          accepted_at?: string
          policy_version?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {}
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type:
            | "access_request"
            | "access_approved"
            | "access_rejected"
            | "experiment_finished"
          payload: Record<string, unknown>
          related_experiment_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type:
            | "access_request"
            | "access_approved"
            | "access_rejected"
            | "experiment_finished"
          payload: Record<string, unknown>
          related_experiment_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
          payload?: Record<string, unknown>
        }
      }
      email_log: {
        Row: {
          id: string
          notification_id: string | null
          to_email: string
          subject: string
          template: string
          status: "queued" | "sent" | "failed"
          error: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          notification_id?: string | null
          to_email: string
          subject: string
          template: string
          status: "queued" | "sent" | "failed"
          error?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          status?: "queued" | "sent" | "failed"
          error?: string | null
          sent_at?: string | null
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

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
      // Additional tables will be generated after migrations
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

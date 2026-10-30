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
    PostgrestVersion: "14.17"
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
      _backup_cash_periods_0014: {
        Row: {
          amount: number | null
          backed_up_at: string | null
          created_at: string | null
          due_date: string | null
          id: string | null
          title: string | null
        }
        Insert: {
          amount?: number | null
          backed_up_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          title?: string | null
        }
        Update: {
          amount?: number | null
          backed_up_at?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      _backup_fund_requests_0016: {
        Row: {
          amount: number | null
          approved_by_keuangan: string | null
          approved_by_wali_kelas: string | null
          backed_up_at: string | null
          created_at: string | null
          description: string | null
          id: string | null
          requester_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          title: string | null
        }
        Insert: {
          amount?: number | null
          approved_by_keuangan?: string | null
          approved_by_wali_kelas?: string | null
          backed_up_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          requester_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          title?: string | null
        }
        Update: {
          amount?: number | null
          approved_by_keuangan?: string | null
          approved_by_wali_kelas?: string | null
          backed_up_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          requester_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          title?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string
          content: string
          cover_url: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          cover_url?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_periods: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          period_id: string | null
          proof_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          period_id?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          period_id?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "cash_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_payment_waivers: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          period_id: string
          reason: string
          rejection_reason: string | null
          requested_by: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          period_id: string
          reason: string
          rejection_reason?: string | null
          requested_by: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          period_id?: string
          reason?: string
          rejection_reason?: string | null
          requested_by?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_payment_waivers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_payment_waivers_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "cash_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_payment_waivers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_payment_waivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          attachment_url: string | null
          challenge_id: string
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          challenge_id: string
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          challenge_id?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          closed: boolean
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string
          id: string
          title: string
        }
        Insert: {
          closed?: boolean
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description: string
          id?: string
          title: string
        }
        Update: {
          closed?: boolean
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_documentations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          image_url: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          image_url: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          image_url?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_documentations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_requests: {
        Row: {
          amount: number
          approved_by_keuangan: string | null
          approved_by_wali_kelas: string | null
          created_at: string
          description: string
          id: string
          rejection_reason: string | null
          requester_id: string
          status: Database["public"]["Enums"]["payment_status"]
          title: string
        }
        Insert: {
          amount: number
          approved_by_keuangan?: string | null
          approved_by_wali_kelas?: string | null
          created_at?: string
          description: string
          id?: string
          rejection_reason?: string | null
          requester_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          title: string
        }
        Update: {
          amount?: number
          approved_by_keuangan?: string | null
          approved_by_wali_kelas?: string | null
          created_at?: string
          description?: string
          id?: string
          rejection_reason?: string | null
          requester_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fund_requests_approved_by_keuangan_fkey"
            columns: ["approved_by_keuangan"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_requests_approved_by_wali_kelas_fkey"
            columns: ["approved_by_wali_kelas"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fund_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          idea_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_upvotes: {
        Row: {
          created_at: string
          idea_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          idea_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_upvotes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_upvotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          attachment_url: string | null
          category: Database["public"]["Enums"]["idea_category"]
          created_at: string
          description: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["idea_category"]
          created_at?: string
          description: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["idea_category"]
          created_at?: string
          description?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          id: boolean
          qris_image_path: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          qris_image_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          qris_image_path?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievements: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          interests: string | null
          phone_number: string | null
          role: Database["public"]["Enums"]["user_role"]
          student_id_number: string | null
        }
        Insert: {
          achievements?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name: string
          id: string
          interests?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          student_id_number?: string | null
        }
        Update: {
          achievements?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          interests?: string | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          student_id_number?: string | null
        }
        Relationships: []
      }
      rules: {
        Row: {
          body: string
          created_at: string
          id: string
          position: number
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          position?: number
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: []
      }
      submission_votes: {
        Row: {
          created_at: string
          submission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          submission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_fund_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      get_admin_profiles: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          student_id_number: string
        }[]
      }
      get_cash_monthly_summary: { Args: never; Returns: Json }
      get_payment_proof_path: {
        Args: { p_transaction_id: string }
        Returns: string
      }
      get_public_cash_summary: { Args: never; Returns: Json }
      get_recent_transactions: { Args: { limit_count?: number }; Returns: Json }
      has_role: {
        Args: { required_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      is_officer: { Args: never; Returns: boolean }
      request_payment_waiver: {
        Args: { p_period_id: string; p_reason: string; p_user_id: string }
        Returns: string
      }
      reject_fund_request: {
        Args: { p_reason: string; p_request_id: string }
        Returns: undefined
      }
      set_active_period: { Args: { p_period_id: string }; Returns: undefined }
      verify_payment_waiver: {
        Args: { p_approve: boolean; p_reason?: string; p_waiver_id: string }
        Returns: undefined
      }
    }
    Enums: {
      idea_category: "ide" | "karya" | "proyek"
      payment_method: "transfer" | "qris" | "cash" | "e_wallet"
      payment_status: "pending" | "approved" | "rejected"
      transaction_type: "income" | "expense"
      user_role: "member" | "keuangan" | "wali_kelas" | "developer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      idea_category: ["ide", "karya", "proyek"],
      payment_method: ["transfer", "qris", "cash", "e_wallet"],
      payment_status: ["pending", "approved", "rejected"],
      transaction_type: ["income", "expense"],
      user_role: ["member", "keuangan", "wali_kelas", "developer"],
    },
  },
} as const

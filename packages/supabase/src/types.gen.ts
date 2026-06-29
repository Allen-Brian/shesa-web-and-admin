export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  core: {
    Tables: {
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_assignments: {
        Row: {
          created_at: string
          ends_at: string | null
          granted_by: string | null
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role_id: string
          scope_id: string
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role_id: string
          scope_id: string
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          granted_by?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string
          scope_id?: string
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_assignments_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
        }
        Relationships: []
      }
      scope_capabilities: {
        Row: {
          can_create_binding_dues: boolean
          can_have_forum: boolean
          can_have_treasury: boolean
          can_have_website_page: boolean
          can_label_active_passive: boolean
          can_manage_members: boolean
          created_at: string
          id: string
          scope_id: string
          updated_at: string
        }
        Insert: {
          can_create_binding_dues?: boolean
          can_have_forum?: boolean
          can_have_treasury?: boolean
          can_have_website_page?: boolean
          can_label_active_passive?: boolean
          can_manage_members?: boolean
          created_at?: string
          id?: string
          scope_id: string
          updated_at?: string
        }
        Update: {
          can_create_binding_dues?: boolean
          can_have_forum?: boolean
          can_have_treasury?: boolean
          can_have_website_page?: boolean
          can_label_active_passive?: boolean
          can_manage_members?: boolean
          created_at?: string
          id?: string
          scope_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scope_capabilities_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: true
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      scopes: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          is_active: boolean
          is_autonomous: boolean
          name: string
          parent_scope_id: string | null
          scope_type: Database["core"]["Enums"]["scope_type"]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          is_autonomous?: boolean
          name: string
          parent_scope_id?: string | null
          scope_type: Database["core"]["Enums"]["scope_type"]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          is_autonomous?: boolean
          name?: string
          parent_scope_id?: string | null
          scope_type?: Database["core"]["Enums"]["scope_type"]
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scopes_parent_scope_id_fkey"
            columns: ["parent_scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_permissions: {
        Args: { p_scope_id: string; p_user_id: string }
        Returns: {
          permission_key: string
        }[]
      }
      has_permission: {
        Args: {
          p_permission_key: string
          p_scope_id: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      scope_type:
        | "mainstream"
        | "branch"
        | "chapter"
        | "batch"
        | "house"
        | "sector"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  core: {
    Enums: {
      scope_type: [
        "mainstream",
        "branch",
        "chapter",
        "batch",
        "house",
        "sector",
      ],
    },
  },
  public: {
    Enums: {},
  },
} as const


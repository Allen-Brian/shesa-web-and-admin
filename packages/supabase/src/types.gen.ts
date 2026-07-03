export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  audit: {
    Tables: {
      audit_entries: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_schema: string
          entity_table: string
          id: string
          ip_address: unknown
          metadata: Json
          scope_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_schema: string
          entity_table: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          scope_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_schema?: string
          entity_table?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          scope_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      log_event: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_schema: string
          p_entity_table: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_scope_id?: string
          p_user_agent?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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
          preferred_persona: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          preferred_persona?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          preferred_persona?: string | null
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
      role_history: {
        Row: {
          action: string
          audit_entry_id: string | null
          changed_at: string
          changed_by: string | null
          id: string
          prior_snapshot: Json | null
          role_assignment_id: string
        }
        Insert: {
          action: string
          audit_entry_id?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          prior_snapshot?: Json | null
          role_assignment_id: string
        }
        Update: {
          action?: string
          audit_entry_id?: string | null
          changed_at?: string
          changed_by?: string | null
          id?: string
          prior_snapshot?: Json | null
          role_assignment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_history_role_assignment_id_fkey"
            columns: ["role_assignment_id"]
            isOneToOne: false
            referencedRelation: "role_assignments"
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
          chapter_kind: Database["core"]["Enums"]["chapter_kind"] | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          entry_year: number | null
          id: string
          metadata: Record<string, unknown>
          name: string
          nickname: string | null
          parent_scope_id: string | null
          region_state: string | null
          scope_type: Database["core"]["Enums"]["scope_type"]
          slug: string
          status: Database["core"]["Enums"]["scope_status"]
          updated_at: string
        }
        Insert: {
          chapter_kind?: Database["core"]["Enums"]["chapter_kind"] | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          entry_year?: number | null
          id?: string
          metadata?: Record<string, unknown>
          name: string
          nickname?: string | null
          parent_scope_id?: string | null
          region_state?: string | null
          scope_type: Database["core"]["Enums"]["scope_type"]
          slug: string
          status?: Database["core"]["Enums"]["scope_status"]
          updated_at?: string
        }
        Update: {
          chapter_kind?: Database["core"]["Enums"]["chapter_kind"] | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          entry_year?: number | null
          id?: string
          metadata?: Record<string, unknown>
          name?: string
          nickname?: string | null
          parent_scope_id?: string | null
          region_state?: string | null
          scope_type?: Database["core"]["Enums"]["scope_type"]
          slug?: string
          status?: Database["core"]["Enums"]["scope_status"]
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
      members: {
        Row: {
          batch_scope_id: string
          created_at: string
          created_by: string | null
          current_city: string | null
          current_country: string | null
          current_region_state: string | null
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          entry_year: number | null
          exit_year: number | null
          field: string | null
          full_name: string
          gender: string | null
          house_scope_id: string
          id: string
          member_status: string
          network_scope_id: string
          phone: string | null
          profile_photo_url: string | null
          updated_at: string
        }
        Insert: {
          batch_scope_id: string
          created_at?: string
          created_by?: string | null
          current_city?: string | null
          current_country?: string | null
          current_region_state?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          entry_year?: number | null
          exit_year?: number | null
          field?: string | null
          full_name: string
          gender?: string | null
          house_scope_id: string
          id?: string
          member_status?: string
          network_scope_id: string
          phone?: string | null
          profile_photo_url?: string | null
          updated_at?: string
        }
        Update: {
          batch_scope_id?: string
          created_at?: string
          created_by?: string | null
          current_city?: string | null
          current_country?: string | null
          current_region_state?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          entry_year?: number | null
          exit_year?: number | null
          field?: string | null
          full_name?: string
          gender?: string | null
          house_scope_id?: string
          id?: string
          member_status?: string
          network_scope_id?: string
          phone?: string | null
          profile_photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_batch_scope_id_fkey"
            columns: ["batch_scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_house_scope_id_fkey"
            columns: ["house_scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_network_scope_id_fkey"
            columns: ["network_scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          join_method: string
          joined_at: string | null
          left_at: string | null
          member_id: string
          membership_status: string
          rejected_at: string | null
          rejected_by: string | null
          scope_id: string
          transferred_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          join_method: string
          joined_at?: string | null
          left_at?: string | null
          member_id: string
          membership_status?: string
          rejected_at?: string | null
          rejected_by?: string | null
          scope_id: string
          transferred_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          join_method?: string
          joined_at?: string | null
          left_at?: string | null
          member_id?: string
          membership_status?: string
          rejected_at?: string | null
          rejected_by?: string | null
          scope_id?: string
          transferred_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          scope_id: string
          color: string
          color_hex: string
          sort_order: number
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          scope_id: string
          color: string
          color_hex: string
          sort_order?: number
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          scope_id?: string
          color?: string
          color_hex?: string
          sort_order?: number
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "houses_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: true
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      networks: {
        Row: {
          scope_id: string
          short_name: string
          description: string | null
          icon: string | null
          color_hex: string | null
          sort_order: number
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          scope_id: string
          short_name: string
          description?: string | null
          icon?: string | null
          color_hex?: string | null
          sort_order?: number
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          scope_id?: string
          short_name?: string
          description?: string | null
          icon?: string | null
          color_hex?: string | null
          sort_order?: number
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "networks_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: true
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          scope_id: string
          country_code: string
          region: string
          city: string
          nickname: string | null
          description: string | null
          registration_fee_required: boolean
          registration_fee_amount: number | null
          registration_fee_currency: string | null
          contact_email: string | null
          contact_phone: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          scope_id: string
          country_code: string
          region: string
          city: string
          nickname?: string | null
          description?: string | null
          registration_fee_required?: boolean
          registration_fee_amount?: number | null
          registration_fee_currency?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          scope_id?: string
          country_code?: string
          region?: string
          city?: string
          nickname?: string | null
          description?: string | null
          registration_fee_required?: boolean
          registration_fee_amount?: number | null
          registration_fee_currency?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: true
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          scope_id: string
          country_code: string
          region: string
          city: string
          nickname: string | null
          description: string | null
          registration_fee_required: boolean
          registration_fee_amount: number | null
          registration_fee_currency: string | null
          contact_email: string | null
          contact_phone: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          scope_id: string
          country_code: string
          region: string
          city: string
          nickname?: string | null
          description?: string | null
          registration_fee_required?: boolean
          registration_fee_amount?: number | null
          registration_fee_currency?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          scope_id?: string
          country_code?: string
          region?: string
          city?: string
          nickname?: string | null
          description?: string | null
          registration_fee_required?: boolean
          registration_fee_amount?: number | null
          registration_fee_currency?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: true
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      position_catalog: {
        Row: {
          id: string
          scope_type: Database["core"]["Enums"]["scope_type"]
          name: string
          description: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scope_type: Database["core"]["Enums"]["scope_type"]
          name: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scope_type?: Database["core"]["Enums"]["scope_type"]
          name?: string
          description?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      position_assignments: {
        Row: {
          id: string
          member_id: string
          scope_id: string
          position_catalog_id: string
          custom_title: string | null
          starts_at: string
          ends_at: string | null
          assigned_by: string | null
          removed_at: string | null
          removed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          scope_id: string
          position_catalog_id: string
          custom_title?: string | null
          starts_at?: string
          ends_at?: string | null
          assigned_by?: string | null
          removed_at?: string | null
          removed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          scope_id?: string
          position_catalog_id?: string
          custom_title?: string | null
          starts_at?: string
          ends_at?: string | null
          assigned_by?: string | null
          removed_at?: string | null
          removed_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_assignments_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_assignments_position_catalog_id_fkey"
            columns: ["position_catalog_id"]
            isOneToOne: false
            referencedRelation: "position_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      member_accounts: {
        Row: {
          id: string
          member_id: string
          auth_user_id: string | null
          claim_status: string
          invited_at: string | null
          claimed_at: string | null
          last_invitation_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          auth_user_id?: string | null
          claim_status?: string
          invited_at?: string | null
          claimed_at?: string | null
          last_invitation_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          auth_user_id?: string | null
          claim_status?: string
          invited_at?: string | null
          claimed_at?: string | null
          last_invitation_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
      create_network: {
        Args: {
          p_name: string
          p_slug: string
          p_short_name: string
          p_description: string | null
          p_icon: string | null
          p_color_hex: string | null
          p_sort_order: number
          p_metadata?: Record<string, unknown>
        }
        Returns: string
      }
      update_network: {
        Args: {
          p_scope_id: string
          p_name: string | null
          p_short_name: string | null
          p_description: string | null
          p_icon: string | null
          p_color_hex: string | null
          p_sort_order: number | null
          p_status: Database["core"]["Enums"]["scope_status"] | null
        }
        Returns: undefined
      }
      create_branch: {
        Args: {
          p_name: string
          p_slug: string
          p_country_code: string
          p_region: string
          p_city: string
          p_currency_code: string
          p_nickname: string | null
          p_description: string | null
          p_registration_fee_required: boolean
          p_registration_fee_amount: number | null
          p_registration_fee_currency: string | null
          p_contact_email: string | null
          p_contact_phone: string | null
          p_metadata?: Record<string, unknown>
        }
        Returns: string
      }
      update_branch: {
        Args: {
          p_scope_id: string
          p_name: string | null
          p_country_code: string | null
          p_region: string | null
          p_city: string | null
          p_currency_code: string | null
          p_nickname: string | null
          p_description: string | null
          p_registration_fee_required: boolean | null
          p_registration_fee_amount: number | null
          p_registration_fee_currency: string | null
          p_contact_email: string | null
          p_contact_phone: string | null
          p_status: Database["core"]["Enums"]["scope_status"] | null
        }
        Returns: undefined
      }
      create_chapter: {
        Args: {
          p_parent_branch_id: string
          p_chapter_kind: Database["core"]["Enums"]["chapter_kind"]
          p_name: string
          p_slug: string
          p_country_code: string
          p_region: string
          p_city: string
          p_currency_code: string | null
          p_nickname: string | null
          p_description: string | null
          p_registration_fee_required: boolean | null
          p_registration_fee_amount: number | null
          p_registration_fee_currency: string | null
          p_contact_email: string | null
          p_contact_phone: string | null
          p_metadata?: Record<string, unknown>
        }
        Returns: string
      }
      update_chapter: {
        Args: {
          p_scope_id: string
          p_name: string | null
          p_country_code: string | null
          p_region: string | null
          p_city: string | null
          p_currency_code: string | null
          p_nickname: string | null
          p_description: string | null
          p_registration_fee_required: boolean | null
          p_registration_fee_amount: number | null
          p_registration_fee_currency: string | null
          p_contact_email: string | null
          p_contact_phone: string | null
          p_status: Database["core"]["Enums"]["scope_status"] | null
        }
        Returns: undefined
      }
      change_chapter_autonomy: {
        Args: {
          p_scope_id: string
          p_new_kind: Database["core"]["Enums"]["chapter_kind"]
        }
        Returns: undefined
      }
    }
    Enums: {
      chapter_kind: "autonomous" | "grouping"
      scope_status: "active" | "inactive" | "archived"
      scope_type:
        | "mainstream"
        | "branch"
        | "chapter"
        | "batch"
        | "house"
        | "network"
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
  audit: {
    Enums: {},
  },
  core: {
    Enums: {
      chapter_kind: ["autonomous", "grouping"],
      scope_status: ["active", "inactive", "archived"],
      scope_type: [
        "mainstream",
        "branch",
        "chapter",
        "batch",
        "house",
        "network",
      ],
    },
  },
  public: {
    Enums: {},
  },
} as const


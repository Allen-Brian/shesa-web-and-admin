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
      batches: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          description: string | null
          metadata: Json
          nickname: string | null
          ordinal: number | null
          scope_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          metadata?: Json
          nickname?: string | null
          ordinal?: number | null
          scope_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          metadata?: Json
          nickname?: string | null
          ordinal?: number | null
          scope_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: true
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          city: string
          contact_email: string | null
          contact_phone: string | null
          country_code: string
          created_at: string
          description: string | null
          metadata: Json
          nickname: string | null
          region: string
          registration_fee_amount: number | null
          registration_fee_currency: string | null
          registration_fee_required: boolean
          scope_id: string
          updated_at: string
        }
        Insert: {
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          country_code: string
          created_at?: string
          description?: string | null
          metadata?: Json
          nickname?: string | null
          region: string
          registration_fee_amount?: number | null
          registration_fee_currency?: string | null
          registration_fee_required?: boolean
          scope_id: string
          updated_at?: string
        }
        Update: {
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          description?: string | null
          metadata?: Json
          nickname?: string | null
          region?: string
          registration_fee_amount?: number | null
          registration_fee_currency?: string | null
          registration_fee_required?: boolean
          scope_id?: string
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
          city: string
          contact_email: string | null
          contact_phone: string | null
          country_code: string
          created_at: string
          description: string | null
          metadata: Json
          nickname: string | null
          region: string
          registration_fee_amount: number | null
          registration_fee_currency: string | null
          registration_fee_required: boolean
          scope_id: string
          updated_at: string
        }
        Insert: {
          city: string
          contact_email?: string | null
          contact_phone?: string | null
          country_code: string
          created_at?: string
          description?: string | null
          metadata?: Json
          nickname?: string | null
          region: string
          registration_fee_amount?: number | null
          registration_fee_currency?: string | null
          registration_fee_required?: boolean
          scope_id: string
          updated_at?: string
        }
        Update: {
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          country_code?: string
          created_at?: string
          description?: string | null
          metadata?: Json
          nickname?: string | null
          region?: string
          registration_fee_amount?: number | null
          registration_fee_currency?: string | null
          registration_fee_required?: boolean
          scope_id?: string
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
      grouping_chapter_tags: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          grouping_chapter_scope_id: string
          id: string
          member_id: string
          parent_branch_scope_id: string
          removed_at: string | null
          removed_by: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          grouping_chapter_scope_id: string
          id?: string
          member_id: string
          parent_branch_scope_id: string
          removed_at?: string | null
          removed_by?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          grouping_chapter_scope_id?: string
          id?: string
          member_id?: string
          parent_branch_scope_id?: string
          removed_at?: string | null
          removed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grouping_chapter_tags_grouping_chapter_scope_id_fkey"
            columns: ["grouping_chapter_scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grouping_chapter_tags_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grouping_chapter_tags_parent_branch_scope_id_fkey"
            columns: ["parent_branch_scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          color: string
          color_hex: string
          created_at: string
          metadata: Json
          scope_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color: string
          color_hex: string
          created_at?: string
          metadata?: Json
          scope_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          color_hex?: string
          created_at?: string
          metadata?: Json
          scope_id?: string
          sort_order?: number
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
      import_batches: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_rows: number
          duplicate_rows: number
          file_name: string
          id: string
          invalid_rows: number
          parse_error: string | null
          scope_id: string
          status: Database["core"]["Enums"]["import_batch_status"]
          storage_path: string
          total_rows: number
          uploaded_by: string
          valid_rows: number
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_rows?: number
          duplicate_rows?: number
          file_name: string
          id?: string
          invalid_rows?: number
          parse_error?: string | null
          scope_id: string
          status?: Database["core"]["Enums"]["import_batch_status"]
          storage_path: string
          total_rows?: number
          uploaded_by: string
          valid_rows?: number
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_rows?: number
          duplicate_rows?: number
          file_name?: string
          id?: string
          invalid_rows?: number
          parse_error?: string | null
          scope_id?: string
          status?: Database["core"]["Enums"]["import_batch_status"]
          storage_path?: string
          total_rows?: number
          uploaded_by?: string
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          created_at: string
          created_member_id: string | null
          duplicate_signals: Json
          errors: Json
          id: string
          import_batch_id: string
          normalized_data: Json
          raw_data: Json
          row_number: number
          validation_status: Database["core"]["Enums"]["import_row_status"]
        }
        Insert: {
          created_at?: string
          created_member_id?: string | null
          duplicate_signals?: Json
          errors?: Json
          id?: string
          import_batch_id: string
          normalized_data?: Json
          raw_data: Json
          row_number: number
          validation_status?: Database["core"]["Enums"]["import_row_status"]
        }
        Update: {
          created_at?: string
          created_member_id?: string | null
          duplicate_signals?: Json
          errors?: Json
          id?: string
          import_batch_id?: string
          normalized_data?: Json
          raw_data?: Json
          row_number?: number
          validation_status?: Database["core"]["Enums"]["import_row_status"]
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_created_member_id_fkey"
            columns: ["created_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      member_accounts: {
        Row: {
          auth_user_id: string | null
          claim_status: Database["core"]["Enums"]["member_claim_status"]
          claimed_at: string | null
          created_at: string
          id: string
          invite_error: string | null
          invited_at: string | null
          last_invitation_sent_at: string | null
          member_id: string
          resent_count: number
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          claim_status?: Database["core"]["Enums"]["member_claim_status"]
          claimed_at?: string | null
          created_at?: string
          id?: string
          invite_error?: string | null
          invited_at?: string | null
          last_invitation_sent_at?: string | null
          member_id: string
          resent_count?: number
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          claim_status?: Database["core"]["Enums"]["member_claim_status"]
          claimed_at?: string | null
          created_at?: string
          id?: string
          invite_error?: string | null
          invited_at?: string | null
          last_invitation_sent_at?: string | null
          member_id?: string
          resent_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
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
          member_code: string
          member_status: Database["core"]["Enums"]["member_status"]
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
          member_code?: string
          member_status?: Database["core"]["Enums"]["member_status"]
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
          member_code?: string
          member_status?: Database["core"]["Enums"]["member_status"]
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
            foreignKeyName: "members_sector_scope_id_fkey"
            columns: ["network_scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_transfers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          created_at: string
          destination_scope_id: string
          id: string
          member_id: string
          metadata: Json
          reason: string | null
          rejected_at: string | null
          rejected_by: string | null
          requested_at: string
          requested_by: string | null
          source_scope_id: string
          status: Database["core"]["Enums"]["membership_transfer_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          created_at?: string
          destination_scope_id: string
          id?: string
          member_id: string
          metadata?: Json
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by?: string | null
          source_scope_id: string
          status?: Database["core"]["Enums"]["membership_transfer_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          created_at?: string
          destination_scope_id?: string
          id?: string
          member_id?: string
          metadata?: Json
          reason?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          requested_at?: string
          requested_by?: string | null
          source_scope_id?: string
          status?: Database["core"]["Enums"]["membership_transfer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "membership_transfers_destination_scope_id_fkey"
            columns: ["destination_scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_transfers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_transfers_source_scope_id_fkey"
            columns: ["source_scope_id"]
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
          engagement: Database["core"]["Enums"]["engagement_tier"]
          id: string
          join_method: Database["core"]["Enums"]["membership_join_method"]
          joined_at: string | null
          left_at: string | null
          member_id: string
          membership_status: Database["core"]["Enums"]["membership_status"]
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
          engagement?: Database["core"]["Enums"]["engagement_tier"]
          id?: string
          join_method: Database["core"]["Enums"]["membership_join_method"]
          joined_at?: string | null
          left_at?: string | null
          member_id: string
          membership_status?: Database["core"]["Enums"]["membership_status"]
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
          engagement?: Database["core"]["Enums"]["engagement_tier"]
          id?: string
          join_method?: Database["core"]["Enums"]["membership_join_method"]
          joined_at?: string | null
          left_at?: string | null
          member_id?: string
          membership_status?: Database["core"]["Enums"]["membership_status"]
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
      networks: {
        Row: {
          color_hex: string | null
          created_at: string
          description: string | null
          icon: string | null
          metadata: Json
          scope_id: string
          short_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          metadata?: Json
          scope_id: string
          short_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          metadata?: Json
          scope_id?: string
          short_name?: string
          sort_order?: number
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
      position_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          custom_title: string | null
          ends_at: string | null
          id: string
          member_id: string
          position_catalog_id: string
          removed_at: string | null
          removed_by: string | null
          scope_id: string
          starts_at: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          custom_title?: string | null
          ends_at?: string | null
          id?: string
          member_id: string
          position_catalog_id: string
          removed_at?: string | null
          removed_by?: string | null
          scope_id: string
          starts_at?: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          custom_title?: string | null
          ends_at?: string | null
          id?: string
          member_id?: string
          position_catalog_id?: string
          removed_at?: string | null
          removed_by?: string | null
          scope_id?: string
          starts_at?: string
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
            foreignKeyName: "position_assignments_position_catalog_id_fkey"
            columns: ["position_catalog_id"]
            isOneToOne: false
            referencedRelation: "position_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_assignments_scope_id_fkey"
            columns: ["scope_id"]
            isOneToOne: false
            referencedRelation: "scopes"
            referencedColumns: ["id"]
          },
        ]
      }
      position_catalog: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          scope_type: Database["core"]["Enums"]["scope_type"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scope_type: Database["core"]["Enums"]["scope_type"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scope_type?: Database["core"]["Enums"]["scope_type"]
          sort_order?: number
          updated_at?: string
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
      registration_status: {
        Row: {
          amount: number | null
          created_at: string
          currency_code: string | null
          fee_required: boolean
          id: string
          marked_paid_at: string | null
          marked_paid_by: string | null
          membership_id: string
          notes: string | null
          paid_on_behalf_at: string | null
          paid_on_behalf_by: string | null
          paid_on_behalf_note: string | null
          updated_at: string
          waived_at: string | null
          waived_by: string | null
          waived_reason: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency_code?: string | null
          fee_required?: boolean
          id?: string
          marked_paid_at?: string | null
          marked_paid_by?: string | null
          membership_id: string
          notes?: string | null
          paid_on_behalf_at?: string | null
          paid_on_behalf_by?: string | null
          paid_on_behalf_note?: string | null
          updated_at?: string
          waived_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency_code?: string | null
          fee_required?: boolean
          id?: string
          marked_paid_at?: string | null
          marked_paid_by?: string | null
          membership_id?: string
          notes?: string | null
          paid_on_behalf_at?: string | null
          paid_on_behalf_by?: string | null
          paid_on_behalf_note?: string | null
          updated_at?: string
          waived_at?: string | null
          waived_by?: string | null
          waived_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_status_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
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
          scope_id: string | null
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
          scope_id?: string | null
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
          scope_id?: string | null
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
          metadata: Json
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
          metadata?: Json
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
          metadata?: Json
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_member_via_attribute: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: boolean
      }
      can_read_member_via_membership: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: boolean
      }
      can_read_member_via_transfer: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: boolean
      }
      can_read_membership_via_member_attribute: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_role_history: {
        Args: { p_role_assignment_id: string }
        Returns: boolean
      }
      change_chapter_autonomy: {
        Args: {
          p_new_kind: Database["core"]["Enums"]["chapter_kind"]
          p_scope_id: string
        }
        Returns: undefined
      }
      create_batch: {
        Args: {
          p_contact_email: string
          p_contact_phone: string
          p_description: string
          p_entry_year: number
          p_metadata?: Json
          p_name: string
          p_nickname: string
          p_ordinal: number
          p_slug: string
        }
        Returns: string
      }
      create_branch: {
        Args: {
          p_city: string
          p_contact_email: string
          p_contact_phone: string
          p_country_code: string
          p_currency_code: string
          p_description: string
          p_metadata?: Json
          p_name: string
          p_nickname: string
          p_region: string
          p_registration_fee_amount: number
          p_registration_fee_currency: string
          p_registration_fee_required: boolean
          p_slug: string
        }
        Returns: string
      }
      create_chapter: {
        Args: {
          p_chapter_kind: Database["core"]["Enums"]["chapter_kind"]
          p_city: string
          p_contact_email: string
          p_contact_phone: string
          p_country_code: string
          p_currency_code: string
          p_description: string
          p_metadata?: Json
          p_name: string
          p_nickname: string
          p_parent_branch_id: string
          p_region: string
          p_registration_fee_amount: number
          p_registration_fee_currency: string
          p_registration_fee_required: boolean
          p_slug: string
        }
        Returns: string
      }
      create_network: {
        Args: {
          p_color_hex: string
          p_description: string
          p_icon: string
          p_metadata?: Json
          p_name: string
          p_short_name: string
          p_slug: string
          p_sort_order: number
        }
        Returns: string
      }
      get_user_grants: {
        Args: { p_user_id: string }
        Returns: {
          permission_keys: string[]
          role_key: string
          scope_id: string
          scope_name: string
          scope_type: string
        }[]
      }
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
      is_admin_role_key: { Args: { role_key: string }; Returns: boolean }
      mainstream_scope_id: { Args: never; Returns: string }
      member_owned_by: {
        Args: { p_member_id: string; p_user_id: string }
        Returns: boolean
      }
      membership_owned_by: {
        Args: { p_membership_id: string; p_user_id: string }
        Returns: boolean
      }
      notify_source_of_transfer: {
        Args: {
          p_actor_id: string
          p_membership_id: string
          p_source_scope_id: string
        }
        Returns: number
      }
      perform_transfer: {
        Args: {
          p_approved_by: string
          p_destination_scope_id: string
          p_source_membership_id: string
          p_transfer_request_id?: string
        }
        Returns: string
      }
      registration_state:
        | {
            Args: {
              p_fee_required: boolean
              p_marked_paid_at: string
              p_paid_on_behalf_at: string
              p_waived_at: string
            }
            Returns: string
          }
        | {
            Args: {
              t: Database["core"]["Tables"]["registration_status"]["Row"]
            }
            Returns: string
          }
      update_batch: {
        Args: {
          p_contact_email: string
          p_contact_phone: string
          p_description: string
          p_name: string
          p_nickname: string
          p_ordinal: number
          p_scope_id: string
          p_status: Database["core"]["Enums"]["scope_status"]
        }
        Returns: undefined
      }
      update_branch: {
        Args: {
          p_city: string
          p_contact_email: string
          p_contact_phone: string
          p_country_code: string
          p_currency_code: string
          p_description: string
          p_name: string
          p_nickname: string
          p_region: string
          p_registration_fee_amount: number
          p_registration_fee_currency: string
          p_registration_fee_required: boolean
          p_scope_id: string
          p_status: Database["core"]["Enums"]["scope_status"]
        }
        Returns: undefined
      }
      update_chapter: {
        Args: {
          p_city: string
          p_contact_email: string
          p_contact_phone: string
          p_country_code: string
          p_currency_code: string
          p_description: string
          p_name: string
          p_nickname: string
          p_region: string
          p_registration_fee_amount: number
          p_registration_fee_currency: string
          p_registration_fee_required: boolean
          p_scope_id: string
          p_status: Database["core"]["Enums"]["scope_status"]
        }
        Returns: undefined
      }
      update_network: {
        Args: {
          p_color_hex: string
          p_description: string
          p_icon: string
          p_name: string
          p_scope_id: string
          p_short_name: string
          p_sort_order: number
          p_status: Database["core"]["Enums"]["scope_status"]
        }
        Returns: undefined
      }
      would_be_last_admin: {
        Args: { p_role_assignment_id: string }
        Returns: boolean
      }
    }
    Enums: {
      chapter_kind: "autonomous" | "grouping"
      engagement_tier: "dormant" | "normal" | "engaged" | "committed" | "pillar"
      import_batch_status:
        | "uploaded"
        | "validated"
        | "confirmed"
        | "cancelled"
        | "failed"
      import_row_status:
        | "pending"
        | "valid"
        | "invalid"
        | "duplicate"
        | "skipped"
        | "created"
      member_claim_status: "not_invited" | "invited" | "claimed" | "disabled"
      member_status: "active" | "deceased"
      membership_join_method:
        | "self_request"
        | "admin_added"
        | "import"
        | "transfer"
      membership_status:
        | "pending"
        | "active"
        | "passive"
        | "transferred"
        | "left"
        | "rejected"
      membership_transfer_status:
        | "pending"
        | "approved"
        | "rejected"
        | "cancelled"
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
  exco: {
    Tables: {
      announcements: {
        Row: {
          audience_definition: Json
          body: string
          channels: Database["exco"]["Enums"]["announcement_channel"][]
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          owner_scope_id: string
          published_at: string | null
          resolved_audience_size: number | null
          scheduled_publish_at: string | null
          status: Database["exco"]["Enums"]["announcement_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience_definition?: Json
          body?: string
          channels?: Database["exco"]["Enums"]["announcement_channel"][]
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          owner_scope_id: string
          published_at?: string | null
          resolved_audience_size?: number | null
          scheduled_publish_at?: string | null
          status?: Database["exco"]["Enums"]["announcement_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience_definition?: Json
          body?: string
          channels?: Database["exco"]["Enums"]["announcement_channel"][]
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          owner_scope_id?: string
          published_at?: string | null
          resolved_audience_size?: number | null
          scheduled_publish_at?: string | null
          status?: Database["exco"]["Enums"]["announcement_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      event_program_items: {
        Row: {
          created_at: string
          detail: string | null
          event_id: string
          id: string
          sort_order: number
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          event_id: string
          id?: string
          sort_order?: number
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          event_id?: string
          id?: string
          sort_order?: number
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_program_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          member_id: string
          pledge_amount: number | null
          response: Database["exco"]["Enums"]["rsvp_response"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          member_id: string
          pledge_amount?: number | null
          response: Database["exco"]["Enums"]["rsvp_response"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          member_id?: string
          pledge_amount?: number | null
          response?: Database["exco"]["Enums"]["rsvp_response"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          advert_image_urls: string[]
          audience_definition: Json
          contribution_charge_id: string | null
          created_at: string
          created_by: string | null
          description: string
          end_at: string
          id: string
          mode: string | null
          name: string
          online_url: string | null
          owner_scope_id: string
          published_at: string | null
          reminder_cadence: Database["exco"]["Enums"]["reminder_cadence"] | null
          reminder_custom_message: string | null
          reminder_start_at: string | null
          resolved_audience_size: number | null
          rsvp_enabled: boolean
          scheduled_publish_at: string | null
          start_at: string
          status: Database["exco"]["Enums"]["event_status"]
          timezone: string
          types: Database["exco"]["Enums"]["event_type"][]
          updated_at: string
          updated_by: string | null
          venue_address: string | null
          venue_map_url: string | null
          venue_name: string | null
        }
        Insert: {
          advert_image_urls?: string[]
          audience_definition?: Json
          contribution_charge_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_at: string
          id?: string
          mode?: string | null
          name: string
          online_url?: string | null
          owner_scope_id: string
          published_at?: string | null
          reminder_cadence?:
            | Database["exco"]["Enums"]["reminder_cadence"]
            | null
          reminder_custom_message?: string | null
          reminder_start_at?: string | null
          resolved_audience_size?: number | null
          rsvp_enabled?: boolean
          scheduled_publish_at?: string | null
          start_at: string
          status?: Database["exco"]["Enums"]["event_status"]
          timezone?: string
          types?: Database["exco"]["Enums"]["event_type"][]
          updated_at?: string
          updated_by?: string | null
          venue_address?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
        }
        Update: {
          advert_image_urls?: string[]
          audience_definition?: Json
          contribution_charge_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          end_at?: string
          id?: string
          mode?: string | null
          name?: string
          online_url?: string | null
          owner_scope_id?: string
          published_at?: string | null
          reminder_cadence?:
            | Database["exco"]["Enums"]["reminder_cadence"]
            | null
          reminder_custom_message?: string | null
          reminder_start_at?: string | null
          resolved_audience_size?: number | null
          rsvp_enabled?: boolean
          scheduled_publish_at?: string | null
          start_at?: string
          status?: Database["exco"]["Enums"]["event_status"]
          timezone?: string
          types?: Database["exco"]["Enums"]["event_type"][]
          updated_at?: string
          updated_by?: string | null
          venue_address?: string | null
          venue_map_url?: string | null
          venue_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_audience: { Args: { def: Json }; Returns: number }
      resolve_audience: {
        Args: { def: Json }
        Returns: {
          member_id: string
        }[]
      }
    }
    Enums: {
      announcement_channel: "in_app" | "email" | "forum"
      announcement_status:
        | "draft"
        | "scheduled"
        | "published"
        | "unpublished"
        | "archived"
      event_status:
        | "draft"
        | "scheduled"
        | "published"
        | "unpublished"
        | "archived"
      event_type:
        | "sports"
        | "entertainment"
        | "meeting"
        | "mentorship"
        | "assembly"
        | "networking"
        | "fundraiser"
        | "community_service"
        | "cultural"
        | "training"
        | "ceremony"
        | "celebration"
        | "conference"
        | "other"
      reminder_cadence: "weekly" | "biweekly" | "monthly"
      rsvp_response: "interested" | "going"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  notifications: {
    Tables: {
      notification_deliveries: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          error_message: string | null
          event_id: string
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel: string
          created_at?: string
          error_message?: string | null
          event_id: string
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          error_message?: string | null
          event_id?: string
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "notification_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          recipient_email: string | null
          recipient_phone: string | null
          recipient_user_id: string | null
          scope_id: string | null
          severity: string
          status: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          scope_id?: string | null
          severity: string
          status?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_user_id?: string | null
          scope_id?: string | null
          severity?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_delivery: { Args: { p_delivery_id: string }; Returns: boolean }
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
      engagement_tier: ["dormant", "normal", "engaged", "committed", "pillar"],
      import_batch_status: [
        "uploaded",
        "validated",
        "confirmed",
        "cancelled",
        "failed",
      ],
      import_row_status: [
        "pending",
        "valid",
        "invalid",
        "duplicate",
        "skipped",
        "created",
      ],
      member_claim_status: ["not_invited", "invited", "claimed", "disabled"],
      member_status: ["active", "deceased"],
      membership_join_method: [
        "self_request",
        "admin_added",
        "import",
        "transfer",
      ],
      membership_status: [
        "pending",
        "active",
        "passive",
        "transferred",
        "left",
        "rejected",
      ],
      membership_transfer_status: [
        "pending",
        "approved",
        "rejected",
        "cancelled",
      ],
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
  exco: {
    Enums: {
      announcement_channel: ["in_app", "email", "forum"],
      announcement_status: [
        "draft",
        "scheduled",
        "published",
        "unpublished",
        "archived",
      ],
      event_status: [
        "draft",
        "scheduled",
        "published",
        "unpublished",
        "archived",
      ],
      event_type: [
        "sports",
        "entertainment",
        "meeting",
        "mentorship",
        "assembly",
        "networking",
        "fundraiser",
        "community_service",
        "cultural",
        "training",
        "ceremony",
        "celebration",
        "conference",
        "other",
      ],
      reminder_cadence: ["weekly", "biweekly", "monthly"],
      rsvp_response: ["interested", "going"],
    },
  },
  notifications: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


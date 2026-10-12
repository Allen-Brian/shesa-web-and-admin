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
  awards: {
    Tables: {
      awards: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          edition_id: string
          id: string
          name: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          edition_id: string
          id?: string
          name: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          edition_id?: string
          id?: string
          name?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "awards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      ballot_votes: {
        Row: {
          award_id: string
          ballot_id: string
          candidate_id: string
          id: string
        }
        Insert: {
          award_id: string
          ballot_id: string
          candidate_id: string
          id?: string
        }
        Update: {
          award_id?: string
          ballot_id?: string
          candidate_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ballot_votes_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballot_votes_ballot_id_fkey"
            columns: ["ballot_id"]
            isOneToOne: false
            referencedRelation: "ballots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ballot_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      ballots: {
        Row: {
          college: string
          device_id: string
          edition_id: string
          exco_name: string | null
          exco_post: string | null
          id: string
          ip_hash: string | null
          submitted_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          voter_batch_year: number | null
          voter_branch_label: string | null
        }
        Insert: {
          college: string
          device_id: string
          edition_id: string
          exco_name?: string | null
          exco_post?: string | null
          id?: string
          ip_hash?: string | null
          submitted_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voter_batch_year?: number | null
          voter_branch_label?: string | null
        }
        Update: {
          college?: string
          device_id?: string
          edition_id?: string
          exco_name?: string | null
          exco_post?: string | null
          id?: string
          ip_hash?: string | null
          submitted_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voter_batch_year?: number | null
          voter_branch_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ballots_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          accomplishments: string | null
          award_id: string
          batch_year: number | null
          branch_label: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          nomination_id: string | null
          nominee_id: string | null
          photo_url: string | null
          profession: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          accomplishments?: string | null
          award_id: string
          batch_year?: number | null
          branch_label?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          nomination_id?: string | null
          nominee_id?: string | null
          photo_url?: string | null
          profession?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          accomplishments?: string | null
          award_id?: string
          batch_year?: number | null
          branch_label?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          nomination_id?: string | null
          nominee_id?: string | null
          photo_url?: string | null
          profession?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          edition_id: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          edition_id: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          edition_id?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      editions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ex_student_weight: number
          exco_token: string
          exco_weight: number
          id: string
          is_active: boolean
          name: string
          nominations_close_at: string | null
          nominations_open_at: string | null
          results_published_at: string | null
          slug: string
          updated_at: string
          voting_close_at: string | null
          voting_mode: string
          voting_open_at: string | null
          weighting_method: string
          weights_changed_at: string | null
          weights_changed_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ex_student_weight?: number
          exco_token?: string
          exco_weight?: number
          id?: string
          is_active?: boolean
          name: string
          nominations_close_at?: string | null
          nominations_open_at?: string | null
          results_published_at?: string | null
          slug: string
          updated_at?: string
          voting_close_at?: string | null
          voting_mode?: string
          voting_open_at?: string | null
          weighting_method?: string
          weights_changed_at?: string | null
          weights_changed_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ex_student_weight?: number
          exco_token?: string
          exco_weight?: number
          id?: string
          is_active?: boolean
          name?: string
          nominations_close_at?: string | null
          nominations_open_at?: string | null
          results_published_at?: string | null
          slug?: string
          updated_at?: string
          voting_close_at?: string | null
          voting_mode?: string
          voting_open_at?: string | null
          weighting_method?: string
          weights_changed_at?: string | null
          weights_changed_by?: string | null
        }
        Relationships: []
      }
      exco_posts: {
        Row: {
          created_at: string
          edition_id: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          edition_id: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          edition_id?: string
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "exco_posts_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          award_id: string
          candidate_id: string | null
          citation: string
          created_at: string
          device_id: string
          id: string
          ip_hash: string | null
          nominator_batch_year: number | null
          nominator_branch_label: string | null
          nominator_contact: string | null
          nominator_name: string | null
          nominee_batch_year: number | null
          nominee_branch_label: string | null
          nominee_contact: string | null
          nominee_id: string | null
          nominee_name: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          award_id: string
          candidate_id?: string | null
          citation: string
          created_at?: string
          device_id: string
          id?: string
          ip_hash?: string | null
          nominator_batch_year?: number | null
          nominator_branch_label?: string | null
          nominator_contact?: string | null
          nominator_name?: string | null
          nominee_batch_year?: number | null
          nominee_branch_label?: string | null
          nominee_contact?: string | null
          nominee_id?: string | null
          nominee_name: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          award_id?: string
          candidate_id?: string | null
          citation?: string
          created_at?: string
          device_id?: string
          id?: string
          ip_hash?: string | null
          nominator_batch_year?: number | null
          nominator_branch_label?: string | null
          nominator_contact?: string | null
          nominator_name?: string | null
          nominee_batch_year?: number | null
          nominee_branch_label?: string | null
          nominee_contact?: string | null
          nominee_id?: string | null
          nominee_name?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nominations_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nominations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nominations_nominee_id_fkey"
            columns: ["nominee_id"]
            isOneToOne: false
            referencedRelation: "nominees"
            referencedColumns: ["id"]
          },
        ]
      }
      nominees: {
        Row: {
          award_id: string
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          award_id: string
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          award_id?: string
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nominees_award_id_fkey"
            columns: ["award_id"]
            isOneToOne: false
            referencedRelation: "awards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_nominations: {
        Args: { p_award_id: string }
        Returns: {
          buckets_created: number
          nominations_assigned: number
        }[]
      }
      branches: {
        Args: never
        Returns: {
          kind: string
          name: string
          scope_id: string
        }[]
      }
      cast_ballot: {
        Args: {
          p_batch_year?: number
          p_branch_label?: string
          p_choices: Json
          p_device_id: string
          p_edition_slug: string
          p_exco_name?: string
          p_exco_post?: string
          p_exco_token?: string
          p_ip_hash?: string
        }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      clear_active_edition: { Args: never; Returns: undefined }
      merge_nominees: {
        Args: { p_absorb: string; p_keep: string }
        Returns: number
      }
      merge_suggestions: {
        Args: { p_award_id: string }
        Returns: {
          left_count: number
          left_id: string
          left_name: string
          overlap: number
          right_count: number
          right_id: string
          right_name: string
        }[]
      }
      normalise_name: { Args: { p_name: string }; Returns: string }
      phase: {
        Args: { p_edition: Database["awards"]["Tables"]["editions"]["Row"] }
        Returns: string
      }
      public_ballot: {
        Args: { p_edition_slug?: string; p_exco_token?: string }
        Returns: Json
      }
      public_state: { Args: { p_edition_slug?: string }; Returns: Json }
      results: {
        Args: { p_edition_id: string }
        Returns: {
          award_id: string
          award_name: string
          candidate_id: string
          candidate_name: string
          category_name: string
          ex_student_votes: number
          exco_votes: number
          place: number
          score: number
        }[]
      }
      set_active_edition: { Args: { p_edition_id: string }; Returns: undefined }
      submit_nomination: {
        Args: {
          p_award_id: string
          p_citation: string
          p_device_id: string
          p_ip_hash?: string
          p_nominator_batch_year?: number
          p_nominator_branch_label?: string
          p_nominator_contact?: string
          p_nominator_name?: string
          p_nominee_batch_year?: number
          p_nominee_branch_label?: string
          p_nominee_contact?: string
          p_nominee_name: string
        }
        Returns: {
          ok: boolean
          reason: string
        }[]
      }
      suggest_nominees: {
        Args: { p_edition_slug?: string; p_query: string }
        Returns: {
          name: string
        }[]
      }
      turnout: { Args: { p_edition_id: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  cms: {
    Tables: {
      agm_registrations: {
        Row: {
          amount_xaf: number
          attire_size: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          kind: string
          note: string | null
          payment_method: string
          phone: string
          quantity: number | null
          reference: string
          settled_at: string | null
          settled_by: string | null
        }
        Insert: {
          amount_xaf: number
          attire_size?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          kind: string
          note?: string | null
          payment_method: string
          phone: string
          quantity?: number | null
          reference: string
          settled_at?: string | null
          settled_by?: string | null
        }
        Update: {
          amount_xaf?: number
          attire_size?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          kind?: string
          note?: string | null
          payment_method?: string
          phone?: string
          quantity?: number | null
          reference?: string
          settled_at?: string | null
          settled_by?: string | null
        }
        Relationships: []
      }
      article_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      article_categories_map: {
        Row: {
          article_id: string
          category_id: string
        }
        Insert: {
          article_id: string
          category_id: string
        }
        Update: {
          article_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_categories_map_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_categories_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "article_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_name: string
          author_photo_url: string | null
          author_title: string | null
          banner_url: string | null
          content_html: string
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          publish_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name: string
          author_photo_url?: string | null
          author_title?: string | null
          banner_url?: string | null
          content_html?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          publish_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          author_photo_url?: string | null
          author_title?: string | null
          banner_url?: string | null
          content_html?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          publish_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      batch_leaders: {
        Row: {
          batch: string
          bio: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          profession: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          batch: string
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          batch?: string
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      branch_leaders: {
        Row: {
          bio: string | null
          branch_name: string
          created_at: string
          email: string | null
          id: string
          name: string
          organ_id: string | null
          phone: string | null
          photo_url: string | null
          profession: string | null
          region: string | null
          role: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          branch_name: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organ_id?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          region?: string | null
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          branch_name?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organ_id?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          region?: string | null
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_leaders_organ_id_fkey"
            columns: ["organ_id"]
            isOneToOne: false
            referencedRelation: "organs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_likes: {
        Row: {
          created_at: string
          entity_id: string
          kind: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          kind: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          kind?: string
          visitor_id?: string
        }
        Relationships: []
      }
      content_metrics: {
        Row: {
          entity_id: string
          kind: string
          likes: number
          plays: number
          updated_at: string
          views: number
        }
        Insert: {
          entity_id: string
          kind: string
          likes?: number
          plays?: number
          updated_at?: string
          views?: number
        }
        Update: {
          entity_id?: string
          kind?: string
          likes?: number
          plays?: number
          updated_at?: string
          views?: number
        }
        Relationships: []
      }
      content_views: {
        Row: {
          entity_id: string
          first_seen_at: string
          kind: string
          visitor_id: string
        }
        Insert: {
          entity_id: string
          first_seen_at?: string
          kind: string
          visitor_id: string
        }
        Update: {
          entity_id?: string
          first_seen_at?: string
          kind?: string
          visitor_id?: string
        }
        Relationships: []
      }
      diaspora_leaders: {
        Row: {
          bio: string | null
          branch_name: string
          created_at: string
          email: string | null
          id: string
          name: string
          organ_id: string | null
          phone: string | null
          photo_url: string | null
          profession: string | null
          region: string | null
          role: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          branch_name: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organ_id?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          region?: string | null
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          branch_name?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organ_id?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          region?: string | null
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diaspora_leaders_organ_id_fkey"
            columns: ["organ_id"]
            isOneToOne: false
            referencedRelation: "organs"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_album_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      gallery_album_categories_map: {
        Row: {
          album_id: string
          category_id: string
        }
        Insert: {
          album_id: string
          category_id: string
        }
        Update: {
          album_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_album_categories_map_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_album_categories_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "gallery_album_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_albums: {
        Row: {
          cover_url: string | null
          created_at: string
          date_label: string | null
          description: string | null
          id: string
          linked_event_id: string | null
          linked_organ_id: string | null
          location: string | null
          photographer: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          date_label?: string | null
          description?: string | null
          id?: string
          linked_event_id?: string | null
          linked_organ_id?: string | null
          location?: string | null
          photographer?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          date_label?: string | null
          description?: string | null
          id?: string
          linked_event_id?: string | null
          linked_organ_id?: string | null
          location?: string | null
          photographer?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_albums_linked_event_id_fkey"
            columns: ["linked_event_id"]
            isOneToOne: false
            referencedRelation: "site_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_albums_linked_organ_id_fkey"
            columns: ["linked_organ_id"]
            isOneToOne: false
            referencedRelation: "organs"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_media: {
        Row: {
          album_id: string
          alt: string | null
          aspect: string
          created_at: string
          id: string
          kind: string
          poster_url: string | null
          sort_order: number
          src: string
          thumbnail_url: string | null
        }
        Insert: {
          album_id: string
          alt?: string | null
          aspect?: string
          created_at?: string
          id?: string
          kind: string
          poster_url?: string | null
          sort_order?: number
          src: string
          thumbnail_url?: string | null
        }
        Update: {
          album_id?: string
          alt?: string | null
          aspect?: string
          created_at?: string
          id?: string
          kind?: string
          poster_url?: string | null
          sort_order?: number
          src?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_media_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      mainstream_leaders: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          photo_url: string | null
          position: string
          profession: string | null
          sector_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          photo_url?: string | null
          position: string
          profession?: string | null
          sector_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          position?: string
          profession?: string | null
          sector_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mainstream_leaders_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "mainstream_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      mainstream_sectors: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      organ_sectors: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      organs: {
        Row: {
          achievements: string[]
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          description: string | null
          founded_year: number | null
          id: string
          location: string | null
          logo_url: string | null
          member_count: number
          name: string
          sector_id: string
          short_name: string | null
          slug: string
          sort_order: number
          updated_at: string
          website_url: string | null
        }
        Insert: {
          achievements?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          founded_year?: number | null
          id?: string
          location?: string | null
          logo_url?: string | null
          member_count?: number
          name: string
          sector_id: string
          short_name?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          achievements?: string[]
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          founded_year?: number | null
          id?: string
          location?: string | null
          logo_url?: string | null
          member_count?: number
          name?: string
          sector_id?: string
          short_name?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organs_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "organ_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      project_categories_map: {
        Row: {
          category_id: string
          project_id: string
        }
        Insert: {
          category_id: string
          project_id: string
        }
        Update: {
          category_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_categories_map_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          banner_url: string | null
          contribution_charge_id: string | null
          created_at: string
          description_html: string
          funding_currency: string | null
          funding_raised: number | null
          funding_target: number | null
          id: string
          impact_stats: Json
          is_featured: boolean
          lead: string | null
          location: string | null
          milestones: Json
          short_description: string | null
          slug: string
          started_on: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          contribution_charge_id?: string | null
          created_at?: string
          description_html?: string
          funding_currency?: string | null
          funding_raised?: number | null
          funding_target?: number | null
          id?: string
          impact_stats?: Json
          is_featured?: boolean
          lead?: string | null
          location?: string | null
          milestones?: Json
          short_description?: string | null
          slug: string
          started_on?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          contribution_charge_id?: string | null
          created_at?: string
          description_html?: string
          funding_currency?: string | null
          funding_raised?: number | null
          funding_target?: number | null
          id?: string
          impact_stats?: Json
          is_featured?: boolean
          lead?: string | null
          location?: string | null
          milestones?: Json
          short_description?: string | null
          slug?: string
          started_on?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_event_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_event_categories_map: {
        Row: {
          category_id: string
          event_id: string
        }
        Insert: {
          category_id: string
          event_id: string
        }
        Update: {
          category_id?: string
          event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_event_categories_map_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "site_event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_event_categories_map_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "site_events"
            referencedColumns: ["id"]
          },
        ]
      }
      site_events: {
        Row: {
          album_slug: string | null
          banner_url: string | null
          city: string | null
          contribution_charge_id: string | null
          created_at: string
          description_html: string
          ends_at: string | null
          flyers: Json
          has_ticketing: boolean
          id: string
          is_featured: boolean
          location: string | null
          program: Json
          short_description: string | null
          slug: string
          starts_at: string
          ticket_currency: string | null
          ticket_price: number | null
          ticket_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          album_slug?: string | null
          banner_url?: string | null
          city?: string | null
          contribution_charge_id?: string | null
          created_at?: string
          description_html?: string
          ends_at?: string | null
          flyers?: Json
          has_ticketing?: boolean
          id?: string
          is_featured?: boolean
          location?: string | null
          program?: Json
          short_description?: string | null
          slug: string
          starts_at: string
          ticket_currency?: string | null
          ticket_price?: number | null
          ticket_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          album_slug?: string | null
          banner_url?: string | null
          city?: string | null
          contribution_charge_id?: string | null
          created_at?: string
          description_html?: string
          ends_at?: string | null
          flyers?: Json
          has_ticketing?: boolean
          id?: string
          is_featured?: boolean
          location?: string | null
          program?: Json
          short_description?: string | null
          slug?: string
          starts_at?: string
          ticket_currency?: string | null
          ticket_price?: number | null
          ticket_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      song_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      songs: {
        Row: {
          audio_url: string
          cover_url: string | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          group_id: string
          id: string
          lyrics: string | null
          performer: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          audio_url: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          group_id: string
          id?: string
          lyrics?: string | null
          performer?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          audio_url?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          group_id?: string
          id?: string
          lyrics?: string | null
          performer?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "songs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "song_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_throttle: {
        Row: {
          bucket_key: string
          hit_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          hit_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          bucket_key?: string
          hit_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_submission_slot: {
        Args: {
          p_bucket_key: string
          p_limit?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      get_content_metrics: {
        Args: { p_entity_ids: string[]; p_kind: string; p_visitor_id?: string }
        Returns: {
          entity_id: string
          liked: boolean
          likes: number
          plays: number
          views: number
        }[]
      }
      prune_submission_throttle: {
        Args: { p_older_than_seconds?: number }
        Returns: number
      }
      record_content_view: {
        Args: { p_entity_id: string; p_kind: string; p_visitor_id?: string }
        Returns: number
      }
      record_song_play: { Args: { p_entity_id: string }; Returns: number }
      submit_agm_registration: {
        Args: {
          p_amount_xaf: number
          p_attire_size?: string
          p_email?: string
          p_full_name: string
          p_kind: string
          p_note?: string
          p_payment_method: string
          p_phone: string
          p_quantity?: number
        }
        Returns: {
          reference: string
        }[]
      }
      toggle_content_like: {
        Args: { p_entity_id: string; p_kind: string; p_visitor_id: string }
        Returns: {
          liked: boolean
          likes: number
        }[]
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
          member_code: string
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
      has_permission_at_any_scope: {
        Args: { p_key: string; p_user_id: string }
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
  finance: {
    Tables: {
      charge_amount_versions: {
        Row: {
          amount: number
          charge_id: string
          created_at: string
          created_by: string | null
          currency: string
          effective_from: string
          id: string
          target_scope_id: string | null
        }
        Insert: {
          amount: number
          charge_id: string
          created_at?: string
          created_by?: string | null
          currency: string
          effective_from: string
          id?: string
          target_scope_id?: string | null
        }
        Update: {
          amount?: number
          charge_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_from?: string
          id?: string
          target_scope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charge_amount_versions_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      charge_targets: {
        Row: {
          amount: number
          charge_id: string
          created_at: string
          currency: string
          id: string
          target_scope_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          charge_id: string
          created_at?: string
          currency: string
          id?: string
          target_scope_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          charge_id?: string
          created_at?: string
          currency?: string
          id?: string
          target_scope_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_targets_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          activation_date: string | null
          base_amount: number | null
          capacity: number | null
          category_id: string | null
          close_date: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          event_id: string | null
          goal_amount: number | null
          group_id: string | null
          id: string
          issue_date: string | null
          lifecycle:
            | Database["finance"]["Enums"]["contribution_lifecycle"]
            | null
          min_amount: number | null
          name: string
          open_date: string | null
          recurrence: Database["finance"]["Enums"]["charge_recurrence"]
          recurrence_interval: number
          scope_id: string
          shape: Database["finance"]["Enums"]["charge_shape"]
          status: Database["finance"]["Enums"]["charge_status"]
          target_filter: Json
          target_party_type: Database["finance"]["Enums"]["party_type"] | null
          updated_at: string
        }
        Insert: {
          activation_date?: string | null
          base_amount?: number | null
          capacity?: number | null
          category_id?: string | null
          close_date?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          description?: string | null
          event_id?: string | null
          goal_amount?: number | null
          group_id?: string | null
          id?: string
          issue_date?: string | null
          lifecycle?:
            | Database["finance"]["Enums"]["contribution_lifecycle"]
            | null
          min_amount?: number | null
          name: string
          open_date?: string | null
          recurrence?: Database["finance"]["Enums"]["charge_recurrence"]
          recurrence_interval?: number
          scope_id: string
          shape: Database["finance"]["Enums"]["charge_shape"]
          status?: Database["finance"]["Enums"]["charge_status"]
          target_filter?: Json
          target_party_type?: Database["finance"]["Enums"]["party_type"] | null
          updated_at?: string
        }
        Update: {
          activation_date?: string | null
          base_amount?: number | null
          capacity?: number | null
          category_id?: string | null
          close_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          event_id?: string | null
          goal_amount?: number | null
          group_id?: string | null
          id?: string
          issue_date?: string | null
          lifecycle?:
            | Database["finance"]["Enums"]["contribution_lifecycle"]
            | null
          min_amount?: number | null
          name?: string
          open_date?: string | null
          recurrence?: Database["finance"]["Enums"]["charge_recurrence"]
          recurrence_interval?: number
          scope_id?: string
          shape?: Database["finance"]["Enums"]["charge_shape"]
          status?: Database["finance"]["Enums"]["charge_status"]
          target_filter?: Json
          target_party_type?: Database["finance"]["Enums"]["party_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "charge_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_extensions: {
        Row: {
          charge_id: string
          created_at: string
          extended_by: string | null
          id: string
          new_close_at: string
          previous_close_at: string
          reason: string | null
        }
        Insert: {
          charge_id: string
          created_at?: string
          extended_by?: string | null
          id?: string
          new_close_at: string
          previous_close_at: string
          reason?: string | null
        }
        Update: {
          charge_id?: string
          created_at?: string
          extended_by?: string | null
          id?: string
          new_close_at?: string
          previous_close_at?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_extensions_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
        ]
      }
      exceptions: {
        Row: {
          charge_id: string
          condition: Json
          created_at: string
          created_by: string | null
          form: Database["finance"]["Enums"]["exception_form"]
          id: string
          is_active: boolean
          member_id: string | null
          priority: number
          replacement_amount: number
        }
        Insert: {
          charge_id: string
          condition?: Json
          created_at?: string
          created_by?: string | null
          form: Database["finance"]["Enums"]["exception_form"]
          id?: string
          is_active?: boolean
          member_id?: string | null
          priority: number
          replacement_amount: number
        }
        Update: {
          charge_id?: string
          condition?: Json
          created_at?: string
          created_by?: string | null
          form?: Database["finance"]["Enums"]["exception_form"]
          id?: string
          is_active?: boolean
          member_id?: string | null
          priority?: number
          replacement_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "exceptions_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          effective_at: string
          from_currency: string
          id: string
          note: string | null
          rate: number
          set_by: string | null
          to_currency: string
        }
        Insert: {
          effective_at?: string
          from_currency: string
          id?: string
          note?: string | null
          rate: number
          set_by?: string | null
          to_currency: string
        }
        Update: {
          effective_at?: string
          from_currency?: string
          id?: string
          note?: string | null
          rate?: number
          set_by?: string | null
          to_currency?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      expense_settings: {
        Row: {
          approval_threshold_amount: number | null
          approval_threshold_currency: string | null
          scope_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approval_threshold_amount?: number | null
          approval_threshold_currency?: string | null
          scope_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approval_threshold_amount?: number | null
          approval_threshold_currency?: string | null
          scope_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          attachment_url: string | null
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          group_id: string | null
          id: string
          incurred_at: string
          payee: string
          recorded_by: string | null
          reversal_reason: string | null
          reverses_expense_id: string | null
          scope_id: string
          status: Database["finance"]["Enums"]["expense_status"]
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          currency: string
          description?: string | null
          group_id?: string | null
          id?: string
          incurred_at?: string
          payee: string
          recorded_by?: string | null
          reversal_reason?: string | null
          reverses_expense_id?: string | null
          scope_id: string
          status?: Database["finance"]["Enums"]["expense_status"]
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          attachment_url?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          group_id?: string | null
          id?: string
          incurred_at?: string
          payee?: string
          recorded_by?: string | null
          reversal_reason?: string | null
          reverses_expense_id?: string | null
          scope_id?: string
          status?: Database["finance"]["Enums"]["expense_status"]
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_reverses_expense_id_fkey"
            columns: ["reverses_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_on: string | null
          id: string
          name: string
          scope_id: string
          show_in_sidebar: boolean
          slug: string
          starts_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_on?: string | null
          id?: string
          name: string
          scope_id: string
          show_in_sidebar?: boolean
          slug: string
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_on?: string | null
          id?: string
          name?: string
          scope_id?: string
          show_in_sidebar?: boolean
          slug?: string
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          amount: number
          created_at: string
          currency: string
          direction: Database["finance"]["Enums"]["ledger_direction"]
          expense_id: string | null
          id: string
          journal_id: string
          memo: string | null
          payment_id: string | null
          scope_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          direction: Database["finance"]["Enums"]["ledger_direction"]
          expense_id?: string | null
          id?: string
          journal_id: string
          memo?: string | null
          payment_id?: string | null
          scope_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          direction?: Database["finance"]["Enums"]["ledger_direction"]
          expense_id?: string | null
          id?: string
          journal_id?: string
          memo?: string | null
          payment_id?: string | null
          scope_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_expense_fk"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_payment_fk"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      obligations: {
        Row: {
          amount: number
          charge_id: string
          created_at: string
          currency: string
          exception_applied: string | null
          id: string
          party_id: string
          party_type: Database["finance"]["Enums"]["party_type"]
          period_end: string | null
          period_start: string | null
          prorated: boolean
          scope_id: string
          status: Database["finance"]["Enums"]["obligation_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          charge_id: string
          created_at?: string
          currency: string
          exception_applied?: string | null
          id?: string
          party_id: string
          party_type: Database["finance"]["Enums"]["party_type"]
          period_end?: string | null
          period_start?: string | null
          prorated?: boolean
          scope_id: string
          status?: Database["finance"]["Enums"]["obligation_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          charge_id?: string
          created_at?: string
          currency?: string
          exception_applied?: string | null
          id?: string
          party_id?: string
          party_type?: Database["finance"]["Enums"]["party_type"]
          period_end?: string | null
          period_start?: string | null
          prorated?: boolean
          scope_id?: string
          status?: Database["finance"]["Enums"]["obligation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligations_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_exception_applied_fkey"
            columns: ["exception_applied"]
            isOneToOne: false
            referencedRelation: "exceptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          available_from: string
          charge_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          failure_reason: string | null
          id: string
          metadata: Json
          method: Database["finance"]["Enums"]["payment_method"] | null
          mode: Database["finance"]["Enums"]["payment_mode"]
          note: string | null
          obligation_id: string | null
          payer_email: string | null
          payer_location: string | null
          payer_member_id: string | null
          payer_name: string | null
          payer_phone: string | null
          quantity: number | null
          resulting_payment_id: string | null
          sandbox_payment_id: string | null
          scope_id: string
          status: Database["finance"]["Enums"]["payment_intent_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          available_from?: string
          charge_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          method?: Database["finance"]["Enums"]["payment_method"] | null
          mode: Database["finance"]["Enums"]["payment_mode"]
          note?: string | null
          obligation_id?: string | null
          payer_email?: string | null
          payer_location?: string | null
          payer_member_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          quantity?: number | null
          resulting_payment_id?: string | null
          sandbox_payment_id?: string | null
          scope_id: string
          status?: Database["finance"]["Enums"]["payment_intent_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          available_from?: string
          charge_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          method?: Database["finance"]["Enums"]["payment_method"] | null
          mode?: Database["finance"]["Enums"]["payment_mode"]
          note?: string | null
          obligation_id?: string | null
          payer_email?: string | null
          payer_location?: string | null
          payer_member_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          quantity?: number | null
          resulting_payment_id?: string | null
          sandbox_payment_id?: string | null
          scope_id?: string
          status?: Database["finance"]["Enums"]["payment_intent_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_resulting_payment_id_fkey"
            columns: ["resulting_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_sandbox_payment_id_fkey"
            columns: ["sandbox_payment_id"]
            isOneToOne: false
            referencedRelation: "sandbox_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          charge_id: string | null
          created_at: string
          currency: string
          external_ref: string | null
          group_id: string | null
          id: string
          metadata: Json
          method: Database["finance"]["Enums"]["payment_method"]
          obligation_id: string | null
          payer_member_id: string | null
          rate_snapshot: number | null
          rate_target_currency: string | null
          recorded_by: string | null
          reversal_reason: string | null
          reverses_payment_id: string | null
          scope_id: string
          source: Database["finance"]["Enums"]["payment_source"]
        }
        Insert: {
          amount: number
          charge_id?: string | null
          created_at?: string
          currency: string
          external_ref?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json
          method: Database["finance"]["Enums"]["payment_method"]
          obligation_id?: string | null
          payer_member_id?: string | null
          rate_snapshot?: number | null
          rate_target_currency?: string | null
          recorded_by?: string | null
          reversal_reason?: string | null
          reverses_payment_id?: string | null
          scope_id: string
          source: Database["finance"]["Enums"]["payment_source"]
        }
        Update: {
          amount?: number
          charge_id?: string | null
          created_at?: string
          currency?: string
          external_ref?: string | null
          group_id?: string | null
          id?: string
          metadata?: Json
          method?: Database["finance"]["Enums"]["payment_method"]
          obligation_id?: string | null
          payer_member_id?: string | null
          rate_snapshot?: number | null
          rate_target_currency?: string | null
          recorded_by?: string | null
          reversal_reason?: string | null
          reverses_payment_id?: string | null
          scope_id?: string
          source?: Database["finance"]["Enums"]["payment_source"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reverses_payment_id_fkey"
            columns: ["reverses_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_verifications: {
        Row: {
          created_at: string
          payment_id: string
          receipt_number: string
          token: string
        }
        Insert: {
          created_at?: string
          payment_id: string
          receipt_number: string
          token: string
        }
        Update: {
          created_at?: string
          payment_id?: string
          receipt_number?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_verifications_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliations: {
        Row: {
          id: string
          matched_ref: string | null
          notes: string | null
          payment_id: string
          reconciled_at: string
          reconciled_by: string
        }
        Insert: {
          id?: string
          matched_ref?: string | null
          notes?: string | null
          payment_id: string
          reconciled_at?: string
          reconciled_by: string
        }
        Update: {
          id?: string
          matched_ref?: string | null
          notes?: string | null
          payment_id?: string
          reconciled_at?: string
          reconciled_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      sandbox_payments: {
        Row: {
          amount: number
          charge_id: string | null
          created_at: string
          currency: string
          gateway_amount: number | null
          gateway_currency: string | null
          gateway_fee: number | null
          gateway_net_amount: number | null
          id: string
          intent_id: string
          method: Database["finance"]["Enums"]["payment_method"]
          obligation_id: string | null
          payer_email: string | null
          payer_member_id: string | null
          payer_name: string | null
          payer_phone: string | null
          provider: string
          provider_ref: string | null
          provider_status: string | null
          provider_transaction_id: string | null
          raw_payload: Json
          scope_id: string
        }
        Insert: {
          amount: number
          charge_id?: string | null
          created_at?: string
          currency: string
          gateway_amount?: number | null
          gateway_currency?: string | null
          gateway_fee?: number | null
          gateway_net_amount?: number | null
          id?: string
          intent_id: string
          method: Database["finance"]["Enums"]["payment_method"]
          obligation_id?: string | null
          payer_email?: string | null
          payer_member_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          provider?: string
          provider_ref?: string | null
          provider_status?: string | null
          provider_transaction_id?: string | null
          raw_payload?: Json
          scope_id: string
        }
        Update: {
          amount?: number
          charge_id?: string | null
          created_at?: string
          currency?: string
          gateway_amount?: number | null
          gateway_currency?: string | null
          gateway_fee?: number | null
          gateway_net_amount?: number | null
          id?: string
          intent_id?: string
          method?: Database["finance"]["Enums"]["payment_method"]
          obligation_id?: string | null
          payer_email?: string | null
          payer_member_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          provider?: string
          provider_ref?: string | null
          provider_status?: string | null
          provider_transaction_id?: string | null
          raw_payload?: Json
          scope_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          buyer_member_id: string | null
          charge_id: string
          created_at: string
          id: string
          payment_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          buyer_member_id?: string | null
          charge_id: string
          created_at?: string
          id?: string
          payment_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          buyer_member_id?: string | null
          charge_id?: string
          created_at?: string
          id?: string
          payment_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "tickets_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_balances: {
        Row: {
          balance: number
          currency: string
          scope_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          currency: string
          scope_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          currency?: string
          scope_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_reports: { Args: { p_scope_id: string }; Returns: boolean }
      compute_period: {
        Args: {
          p_interval: number
          p_recurrence: Database["finance"]["Enums"]["charge_recurrence"]
          p_reference: string
        }
        Returns: {
          period_end: string
          period_start: string
        }[]
      }
      effective_amount: {
        Args: {
          p_charge_id: string
          p_period_start: string
          p_target_scope_id: string
        }
        Returns: number
      }
      generate_obligations_for_charge: {
        Args: { p_charge_id: string; p_reference?: string }
        Returns: number
      }
      generate_obligations_sweep: {
        Args: { p_reference?: string }
        Returns: number
      }
      get_arrears: {
        Args: { p_scope_id: string }
        Returns: {
          amount_owed: number
          amount_paid: number
          arrears: number
          charge_id: string
          charge_name: string
          member_id: string
          member_name: string
          period_start: string
        }[]
      }
      get_collections: {
        Args: { p_from?: string; p_scope_id: string; p_to?: string }
        Returns: {
          charge_id: string
          charge_name: string
          payment_count: number
          shape: string
          total_collected: number
        }[]
      }
      get_contribution_progress: {
        Args: { p_charge_id: string }
        Returns: {
          capacity: number
          charge_id: string
          charge_name: string
          contributor_count: number
          goal_amount: number
          raised: number
          shape: string
          sold: number
        }[]
      }
      get_donation_report: {
        Args: { p_from?: string; p_scope_id: string; p_to?: string }
        Returns: {
          anonymous_count: number
          charge_id: string
          charge_name: string
          donation_count: number
          named_donor_count: number
          total_donated: number
        }[]
      }
      get_exchange_rate: {
        Args: { p_at?: string; p_from_currency: string; p_to_currency: string }
        Returns: number
      }
      get_expense_report_by_category: {
        Args: { p_from?: string; p_scope_id: string; p_to?: string }
        Returns: {
          category_id: string
          category_key: string
          category_name: string
          expense_count: number
          total_amount: number
        }[]
      }
      get_member_statement: {
        Args: { p_from?: string; p_member_id: string; p_to?: string }
        Returns: {
          amount_owed: number
          amount_paid: number
          balance: number
          charge_id: string
          charge_name: string
          obligation_status: string
          period_start: string
          scope_id: string
          scope_name: string
        }[]
      }
      get_payment_method_breakdown: {
        Args: { p_from?: string; p_scope_id: string; p_to?: string }
        Returns: {
          method: string
          payment_count: number
          total_amount: number
        }[]
      }
      get_treasury_statement: {
        Args: { p_from?: string; p_scope_id: string; p_to?: string }
        Returns: {
          closing_balance: number
          currency: string
          expense_sum: number
          income_sum: number
          opening_balance: number
          scope_id: string
        }[]
      }
      public_contribution: {
        Args: { p_charge_id: string }
        Returns: {
          base_amount: number
          charge_id: string
          close_date: string
          currency: string
          is_open: boolean
          name: string
          shape: string
        }[]
      }
      resolve_exception_for_charge: {
        Args: { p_charge_id: string; p_member_id: string; p_reference?: string }
        Returns: {
          exception_id: string
          matched_form: string
          matched_priority: number
          replacement_amount: number
        }[]
      }
      schedule_amount_change: {
        Args: {
          p_actor: string
          p_amount: number
          p_charge_id: string
          p_target_scope_id: string
        }
        Returns: string
      }
      verify_receipt: {
        Args: { p_token: string }
        Returns: {
          amount: number
          charge_name: string
          currency: string
          paid_at: string
          receipt_number: string
          reversed: boolean
          valid: boolean
        }[]
      }
      write_ledger_from_expense: {
        Args: { p_expense_id: string }
        Returns: string
      }
      write_ledger_from_payment: {
        Args: { p_payment_id: string }
        Returns: string
      }
    }
    Enums: {
      charge_recurrence:
        | "one_time"
        | "monthly"
        | "quarterly"
        | "biannual"
        | "yearly"
      charge_shape:
        | "charge"
        | "goal"
        | "open"
        | "ticketed"
        | "fixed"
        | "donation"
      charge_status: "draft" | "active" | "paused" | "archived"
      contribution_lifecycle: "draft" | "open" | "closed" | "archived"
      exception_form: "relative" | "fixed" | "senior" | "individual"
      expense_status: "recorded" | "pending_approval" | "approved"
      ledger_direction: "income" | "expense"
      obligation_status: "open" | "partial" | "paid" | "cancelled" | "forgiven"
      party_type: "member" | "branch"
      payment_intent_status:
        | "initiated"
        | "pending"
        | "succeeded"
        | "failed"
        | "cancelled"
        | "expired"
      payment_method:
        | "mtn_momo"
        | "orange_money"
        | "cash"
        | "bank_transfer"
        | "card"
      payment_mode: "sandbox" | "live"
      payment_source: "auto" | "manual"
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
      queue_delete: {
        Args: { p_msg_id: number; p_queue: string }
        Returns: boolean
      }
      queue_read: {
        Args: { p_qty: number; p_queue: string; p_vt: number }
        Returns: {
          message: Json
          msg_id: number
        }[]
      }
      queue_send: {
        Args: { p_message: Json; p_queue: string }
        Returns: number
      }
      requeue_stranded_events: {
        Args: { p_limit?: number; p_older_than_seconds?: number }
        Returns: number
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
  audit: {
    Enums: {},
  },
  awards: {
    Enums: {},
  },
  cms: {
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
  finance: {
    Enums: {
      charge_recurrence: [
        "one_time",
        "monthly",
        "quarterly",
        "biannual",
        "yearly",
      ],
      charge_shape: ["charge", "goal", "open", "ticketed", "fixed", "donation"],
      charge_status: ["draft", "active", "paused", "archived"],
      contribution_lifecycle: ["draft", "open", "closed", "archived"],
      exception_form: ["relative", "fixed", "senior", "individual"],
      expense_status: ["recorded", "pending_approval", "approved"],
      ledger_direction: ["income", "expense"],
      obligation_status: ["open", "partial", "paid", "cancelled", "forgiven"],
      party_type: ["member", "branch"],
      payment_intent_status: [
        "initiated",
        "pending",
        "succeeded",
        "failed",
        "cancelled",
        "expired",
      ],
      payment_method: [
        "mtn_momo",
        "orange_money",
        "cash",
        "bank_transfer",
        "card",
      ],
      payment_mode: ["sandbox", "live"],
      payment_source: ["auto", "manual"],
    },
  },
  notifications: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

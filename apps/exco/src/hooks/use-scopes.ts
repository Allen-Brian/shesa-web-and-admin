/**
 * Read hooks for `core.scopes`. Uses supabase-js under the caller's
 * anon key — RLS + the session's cookie hydrate the row-level filter.
 *
 * The catalog is small (~80 rows in Phase 1), so we don't paginate.
 */

import { useQuery } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/query-keys';

export interface ScopeRow {
  id: string;
  name: string;
  slug: string;
  scope_type: string;
  parent_scope_id: string | null;
  chapter_kind: 'autonomous' | 'grouping' | null;
  entry_year: number | null;
  nickname: string | null;
  country: string | null;
  region_state: string | null;
  city: string | null;
  currency_code: string;
  is_active: boolean;
  created_at: string;
}

export function useScopesByType(scopeType: string) {
  return useQuery({
    queryKey: queryKeys.scopes.byType(scopeType),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scopes')
        .select('*')
        .eq('scope_type', scopeType)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScopeRow[];
    },
  });
}

export function useScope(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? queryKeys.scopes.detail(id) : ['scopes', 'detail', 'noop'],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('scopes').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as ScopeRow | null;
    },
  });
}

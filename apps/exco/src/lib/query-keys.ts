/**
 * TanStack Query key factories.
 *
 * Centralized so every screen queries the same key shape and cache
 * invalidation is a matter of `queryClient.invalidateQueries({ queryKey: keys.scopes.all })`
 * rather than reconstructing key arrays inline.
 */

export const queryKeys = {
  scopes: {
    all: ['scopes'] as const,
    byType: (scopeType: string) => ['scopes', 'byType', scopeType] as const,
    detail: (id: string) => ['scopes', 'detail', id] as const,
    children: (parentId: string) => ['scopes', 'children', parentId] as const,
  },
  members: {
    all: ['members'] as const,
    list: (filters: Record<string, unknown>) => ['members', 'list', filters] as const,
    detail: (id: string) => ['members', 'detail', id] as const,
  },
  memberships: {
    all: ['memberships'] as const,
    forScope: (scopeId: string) => ['memberships', 'scope', scopeId] as const,
    forMember: (memberId: string) => ['memberships', 'member', memberId] as const,
    requests: ['memberships', 'requests'] as const,
  },
  transfers: {
    all: ['transfers'] as const,
    pending: ['transfers', 'pending'] as const,
  },
  roles: {
    assignmentsForScope: (scopeId: string) => ['roles', 'assignments', 'scope', scopeId] as const,
    assignmentsForUser: (userId: string) => ['roles', 'assignments', 'user', userId] as const,
  },
  positions: {
    catalog: ['positions', 'catalog'] as const,
    assignmentsForScope: (scopeId: string) =>
      ['positions', 'assignments', 'scope', scopeId] as const,
  },
  audit: {
    list: (filters: Record<string, unknown>) => ['audit', 'list', filters] as const,
    detail: (id: string) => ['audit', 'detail', id] as const,
  },
  imports: {
    list: ['imports', 'list'] as const,
    detail: (id: string) => ['imports', 'detail', id] as const,
    rows: (batchId: string) => ['imports', 'rows', batchId] as const,
  },
} as const;

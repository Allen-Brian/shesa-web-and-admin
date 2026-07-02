/**
 * PermissionGuard — cache-backed permission gate for section-level UI.
 *
 * Reads the SPA's grant cache (Zustand session store) and renders
 * `children` iff the caller holds `permission` at `scopeId`. Missing
 * grant falls through to `fallback` (default: nothing).
 *
 * Read routes trust the cache. Write routes still call `check-permission`
 * at commit time via the mutation — the cache is optimistic UI, not
 * a security boundary. See ADR-0035 §Consequences.
 */

import type { ReactNode } from 'react';

import { useHasPermission } from '../lib/session-store';

interface Props {
  permission: string;
  scopeId?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({ permission, scopeId, fallback = null, children }: Props) {
  const allowed = useHasPermission(permission, scopeId);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}

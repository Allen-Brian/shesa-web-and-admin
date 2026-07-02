/**
 * Zustand session store for apps/exco.
 *
 * Consumers:
 *   - Root <AuthGuard> — redirects to auth on `status === 'anonymous'`.
 *   - Sidebar / permission-gated components — call `useHasPermission`.
 *   - Any Edge Function client — reads `accessToken` for the Bearer header.
 *
 * The store is populated by `bootstrap()` on app mount:
 *   1. `fetchSession()` — hits /api/session on apps/auth.
 *   2. If authenticated, `fetchGrants(accessToken)` — hits get-my-grants.
 *
 * Grants are a UX cache, not a security boundary. The Edge Function
 * that actually writes each mutation re-checks `core.has_permission`.
 * A stale cache showing an action that's been revoked results in a
 * 403 at commit time — a UX bug, not a security bug. See ADR-0035.
 */

import { create } from 'zustand';

import { fetchGrants, fetchSession, type Grant, type SessionUser } from './session-api';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface SessionState {
  user: SessionUser | null;
  expiresAt: string | null;
  accessToken: string | null;
  grants: Grant[] | null;
  status: Status;
  bootstrap: () => Promise<void>;
  refreshGrants: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  user: null,
  expiresAt: null,
  accessToken: null,
  grants: null,
  status: 'loading' as Status,
};

export const useSessionStore = create<SessionState>()((set, get) => ({
  ...initialState,

  bootstrap: async () => {
    // Idempotent: multiple StrictMode double-invokes shouldn't fan out
    // parallel requests. If we're already authenticated with grants
    // loaded, skip.
    const current = get();
    if (current.status === 'authenticated' && current.grants !== null) return;

    try {
      const session = await fetchSession();
      if (!session || !session.user || !session.accessToken) {
        set({ ...initialState, status: 'anonymous' });
        return;
      }
      set({
        user: session.user,
        expiresAt: session.expiresAt,
        accessToken: session.accessToken,
        status: 'authenticated',
      });
      await get().refreshGrants();
    } catch (err) {
      // Network / 5xx — treat as unauthenticated so the guard redirects.
      // A retry loop here would just amplify a transient outage.
      console.error('session bootstrap failed', err);
      set({ ...initialState, status: 'anonymous' });
    }
  },

  refreshGrants: async () => {
    const { accessToken } = get();
    if (!accessToken) return;
    try {
      const grants = await fetchGrants(accessToken);
      set({ grants });
    } catch (err) {
      console.error('grants refresh failed', err);
      // Keep whatever cache we had; empty grants array on first bootstrap.
      if (get().grants === null) set({ grants: [] });
    }
  },

  reset: () => set({ ...initialState, status: 'anonymous' }),
}));

/**
 * Selector: does the current user hold `permissionKey` at `scopeId`?
 *
 * A permission counts if the user has any grant at `scopeId` whose
 * role bundle contains the key. Global grants (`scopeId: null` on the
 * grant) count for every scope.
 *
 * Does NOT walk scope ancestry — the plan-level authoritative check
 * (`core.has_permission` via `check-permission` Edge Function) does
 * that at mutation time. For sidebar / list-visibility decisions,
 * direct-grant checks are the right precision.
 */
export function selectHasPermission(
  grants: Grant[] | null,
  permissionKey: string,
  scopeId?: string,
): boolean {
  if (!grants || grants.length === 0) return false;
  return grants.some((g) => {
    const scopeMatches = g.scopeId === null || (scopeId !== undefined && g.scopeId === scopeId);
    return scopeMatches && g.permissionKeys.includes(permissionKey);
  });
}

/** Convenience hook — reads `grants` and closes over the selector. */
export function useHasPermission(permissionKey: string, scopeId?: string): boolean {
  const grants = useSessionStore((s) => s.grants);
  return selectHasPermission(grants, permissionKey, scopeId);
}

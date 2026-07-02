/**
 * AuthGuard — the SPA's route-level authentication gate.
 *
 * Runs `useSessionStore.bootstrap()` on mount, renders a lightweight
 * loading state while the session probe is in flight, and redirects
 * to `apps/auth` with a return-to URL if the probe comes back
 * anonymous.
 *
 * Deliberately NOT a react-router "guard" HOC — that pattern couples
 * the store to the router. This wrapper renders children (or the
 * loading / redirect surface) so tests can assert against the same
 * DOM tree the user sees.
 */

import { useEffect, type ReactNode } from 'react';

import { clientEnv } from '@shesa/config/env.client';

import { useSessionStore } from '../lib/session-store';

interface Props {
  children: ReactNode;
}

export function AuthGuard({ children }: Props) {
  const status = useSessionStore((s) => s.status);
  const bootstrap = useSessionStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'anonymous') return;
    // Redirect to auth with a return-to pointing back to the current
    // path. The auth callback + safeRedirect will validate this URL
    // stays under the shared apex before honoring it.
    const returnTo = window.location.href;
    const authUrl = new URL(clientEnv.NEXT_PUBLIC_AUTH_APP_URL);
    authUrl.searchParams.set('next', returnTo);
    window.location.assign(authUrl.toString());
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  if (status === 'anonymous') {
    // The effect above is redirecting; render nothing to avoid a flash
    // of the guarded children.
    return null;
  }

  return <>{children}</>;
}

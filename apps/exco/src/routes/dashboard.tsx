/**
 * Exco dashboard — Phase 1 E1.0 placeholder.
 *
 * The auth guard has already ensured we have a session by the time
 * this renders. Real role-aware navigation + member management views
 * land in Phase 1 E1.7.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shesa/ui';

import { useSessionStore } from '../lib/session-store';

export function DashboardPage() {
  const user = useSessionStore((s) => s.user);
  const grants = useSessionStore((s) => s.grants);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle>Shesa Exco</CardTitle>
          <CardDescription>Executive Committee — Phase 1 E1.0 placeholder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Signed in as <strong>{user?.email ?? '(unknown)'}</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            {grants && grants.length > 0
              ? `${grants.length} active grant${grants.length === 1 ? '' : 's'} loaded.`
              : 'No active grants yet — Phase 1 seed data will introduce sample roles.'}
          </p>
          <p className="text-xs text-muted-foreground">
            Members, memberships, roles, positions, and audit views land in E1.7.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

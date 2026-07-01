/**
 * Exco dashboard — Phase 0 placeholder.
 *
 * Real role-aware navigation + member management views land alongside
 * the Core domain in Phase 1.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shesa/ui';
import { appUrls } from '@shesa/config/urls';

export function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle>Shesa Exco</CardTitle>
          <CardDescription>Executive Committee — Phase 0 placeholder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vite + React shell. Role-aware navigation + member management views ship in Phase 1
            alongside the Core domain.
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in over at{' '}
            <a className="underline-offset-4 hover:underline" href={appUrls.auth}>
              auth
            </a>{' '}
            — the SSO bridge for SPAs lands in Phase 1+.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

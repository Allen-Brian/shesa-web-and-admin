/**
 * Finance dashboard — Phase 0 placeholder.
 *
 * Real charges / obligations / payments / receipts / treasury views land
 * in Phase 3. This page just confirms the SPA boots, the shared design
 * tokens render, and the toolchain (Vite + React + Tailwind + router +
 * query) is wired together correctly.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shesa/ui';
import { appUrls } from '@shesa/config/urls';

export function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle>Shesa Finance</CardTitle>
          <CardDescription>Internal dashboard — Phase 0 placeholder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vite + React shell. Phase 3 adds the finance domain (charges, obligations, payments,
            receipts, treasury); for now this page just proves the app boots and the shared design
            tokens render.
          </p>
          <p className="text-sm text-muted-foreground">
            Cross-subdomain SSO isn&apos;t wired into this SPA yet — the apex-domain cookie is{' '}
            <code className="font-mono text-xs">httpOnly</code>, which JS can&apos;t read. A
            session-bridge endpoint on{' '}
            <a className="underline-offset-4 hover:underline" href={appUrls.auth}>
              auth
            </a>{' '}
            will resolve that in Phase 1+.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Exco dashboard — Phase 0 placeholder.
 *
 * Real role-aware navigation + member management views land alongside
 * the Core domain in Phase 1. This page just confirms the SPA boots,
 * the shared design tokens render, and the toolchain is wired together.
 */

import { appUrls } from '@shesa/config/urls';

export function DashboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-3xl font-semibold">Shesa Exco</h1>
          <p className="text-sm text-muted-foreground">Executive Committee — Phase 0 placeholder</p>
        </header>

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
      </div>
    </main>
  );
}

/**
 * Login page — Phase 0 placeholder.
 *
 * The Phase 0 auth method is EMAIL-ONLY (per the plan's E9 OTP go/no-go
 * fallback: phone-OTP returns when MTN/Orange SMS delivery is validated
 * with real SIMs, currently a Phase 6 concern). This page renders the
 * email login form in subsequent commits; for the scaffold it's a
 * static placeholder so we can verify the app boots, the cookie config
 * + middleware work, and the @shesa/ui token theme renders correctly.
 */

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Shesa</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </header>

        <div className="rounded-md border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Auth pages land in a follow-up commit.</p>
          <p className="mt-2">
            This scaffold verifies the Next app boots, the shared UI tokens render, and the
            cross-subdomain cookie config is wired up correctly via{' '}
            <code className="font-mono text-xs">@shesa/supabase/server</code>.
          </p>
        </div>
      </div>
    </main>
  );
}

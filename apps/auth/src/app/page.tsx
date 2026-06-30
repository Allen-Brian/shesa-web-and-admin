/**
 * Login page — the home route of the auth app.
 *
 * Server component: reads the `next` and `error` query params, then
 * renders the client `<LoginForm>` for the actual Supabase Auth call.
 *
 * Phase 0 auth mode is email + password (per the plan's OTP go/no-go
 * fallback — phone-OTP returns once MTN/Orange delivery is validated
 * with real SIMs).
 */

import { serverEnv } from '@shesa/config/env.server';

import { safeRedirect } from '@/lib/safe-redirect';

import { LoginForm } from './login-form';

interface LoginPageProps {
  readonly searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'Your sign-in link was incomplete. Please request a new one.',
  auth_failed: 'Sign-in failed. Please try again or request a new link.',
  reset_expired: 'Your password reset link has expired. Request a new one.',
};

const NOTICE_MESSAGES: Record<string, string> = {
  password_updated: 'Password updated. Sign in to continue.',
  reset_sent: 'If that email is registered, a reset link is on its way.',
  signed_out: 'You have been signed out.',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next: nextParam, error, notice } = await searchParams;
  // Sanitize at the page boundary so the hidden form field already
  // carries a safe value — the action sanitizes again as defense in
  // depth.
  const next = safeRedirect(nextParam, serverEnv.APP_BASE_DOMAIN);

  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;
  const noticeMessage = notice ? NOTICE_MESSAGES[notice] : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Shesa</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </header>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {errorMessage}
          </p>
        ) : null}

        {noticeMessage ? (
          <p
            role="status"
            className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
          >
            {noticeMessage}
          </p>
        ) : null}

        <LoginForm next={next} />
      </div>
    </main>
  );
}

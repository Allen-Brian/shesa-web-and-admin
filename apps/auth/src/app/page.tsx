import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shesa/ui';
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
  const next = safeRedirect(nextParam, serverEnv.APP_BASE_DOMAIN);

  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;
  const noticeMessage = notice ? NOTICE_MESSAGES[notice] : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Shesa</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </main>
  );
}

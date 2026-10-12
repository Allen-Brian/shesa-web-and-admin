import { Logo } from '@shesa/ui';
import { serverEnv } from '@shesa/config/env.server';

import { safeRedirect } from '@/lib/safe-redirect';

import { AuthQueryToasts } from '../auth-query-toasts';
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
    <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-card shadow-xl md:grid-cols-2">
      {/* Left — form pane */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-start align-left">
                <h1 className="text-3xl font-bold text-primary">Shesa Connect</h1>
                <h3 className="text-xl font-semibold -mt-1 tracking-tight text-foreground">
                  Administration Portal
                </h3>
              </div>
            </div>
            <h2 className="mt-4 text-sm font-medium text-foreground/80">
              Fill in your credentials to access your account
            </h2>
          </div>

          <AuthQueryToasts errorMessage={errorMessage} noticeMessage={noticeMessage} />
          <LoginForm next={next} />
        </div>
      </div>

      {/* Right — brand pane. The Shesa mark, larger. */}
      <div
        aria-hidden
        className="relative hidden border-l border-border bg-primary/10 md:flex md:items-center md:justify-center md:p-12"
      >
        <Logo size={280} alt="Shesa" />
      </div>
    </div>
  );
}

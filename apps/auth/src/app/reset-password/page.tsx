/**
 * Reset-password page.
 *
 * Gated on the recovery session that the callback set after the user
 * clicked their email link. If `getUser()` returns no user, the
 * recovery code was missing / invalid / expired, and we bounce back to
 * the login page with a hint to request a new link.
 *
 * `force-dynamic` because we read auth state — Next would otherwise try
 * to statically render this page at build time and fail (no cookie store).
 */

import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { ResetPasswordForm } from './form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shesa — Choose a new password',
};

export default async function ResetPasswordPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/?error=reset_expired');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground">
            Pick something at least 8 characters long.
          </p>
        </header>

        <ResetPasswordForm />
      </div>
    </main>
  );
}

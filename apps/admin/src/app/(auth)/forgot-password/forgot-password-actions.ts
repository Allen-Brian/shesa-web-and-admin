'use server';

/**
 * Forgot-password Server Action.
 *
 * Hands the email to Supabase Auth's `resetPasswordForEmail`. Supabase
 * sends the recovery email; the link lands on our own callback (admin
 * owns auth post-ADR-0040) with a recovery code, which exchanges into a
 * short-lived session and lands the user at `/reset-password`.
 *
 * USER ENUMERATION: we ALWAYS return success here, even when the email
 * isn't in `auth.users`. Surfacing "no such user" would let an attacker
 * harvest who's a member without ever creating an account. Supabase's
 * SDK already swallows the not-found path silently, but we belt-and-
 * braces it by ignoring any error other than rate-limit and returning
 * the same generic message in both cases.
 */

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { appUrls } from '@shesa/config/urls';
import { emailSchema } from '@shesa/domain/validators';

import { getServerClient } from '@/lib/supabase-server';

export interface ForgotPasswordState {
  readonly ok: boolean;
  readonly message?: string;
  readonly email?: string;
}

const schema = z.object({
  email: emailSchema,
});

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Please enter a valid email.',
      email: typeof formData.get('email') === 'string' ? String(formData.get('email')) : undefined,
    };
  }

  const { email } = parsed.data;
  const supabase = await getServerClient();

  // The reset link must land on the admin's own callback so the recovery
  // code exchanges into a session under the apex-scoped cookie. From
  // there the callback redirects to `/reset-password` where the user
  // picks a new password.
  const redirectTo = new URL('/callback', appUrls.admin);
  redirectTo.searchParams.set('next', '/reset-password');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo.toString(),
  });

  if (error && error.status === 429) {
    // Rate-limit IS user-visible — we want them to back off, not retry
    // in a tight loop.
    return {
      ok: false,
      message: 'Too many requests. Please wait a few minutes before trying again.',
      email,
    };
  }

  if (error) {
    console.error(
      JSON.stringify({
        level: 'warn',
        component: 'admin.auth.requestPasswordReset',
        message: 'resetPasswordForEmail failed (suppressed from user)',
        status: error.status,
        error: error.message,
      }),
    );
    // Fall through to the generic success below — do NOT leak the
    // failure to the caller. The user-facing UX is identical to the
    // happy path.
  }

  redirect('/login?notice=reset_sent');
}

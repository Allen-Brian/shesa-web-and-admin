'use server';

/**
 * Reset-password Server Action.
 *
 * Called from the new-password form after the user has clicked their
 * recovery email and the callback has already exchanged the recovery
 * code into an active session.
 *
 * Flow:
 *   1. Validate the new password (min length, confirmation match).
 *   2. `supabase.auth.updateUser({ password })`.
 *   3. `supabase.auth.signOut({ scope: 'global' })` — kill every
 *      existing session for this user, including any concurrent
 *      attacker session that might have been opened with the same
 *      recovery link. Forces a fresh login with the new password,
 *      proving the user actually knows the credential they just set.
 *   4. Redirect to `/login?notice=password_updated`.
 */

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { getServerClient } from '@/lib/supabase-server';

export interface ResetPasswordState {
  readonly ok: boolean;
  readonly message?: string;
}

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  });

export async function updatePassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = schema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });

  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return { ok: false, message: first?.message ?? 'Invalid input.' };
  }

  const supabase = await getServerClient();

  // `updateUser` requires an active session. The recovery callback
  // should have set one already; if the recovery code was invalid or
  // expired we'd never have rendered this page (the page Server
  // Component checks `getUser`).
  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (updateError) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'admin.auth.updatePassword',
        message: 'updateUser failed',
        status: updateError.status,
        error: updateError.message,
      }),
    );
    return {
      ok: false,
      message: 'Could not update password. The reset link may have expired.',
    };
  }

  // Global sign-out: invalidate every session for this user so they
  // re-authenticate with the new password. Cookies in this browser are
  // cleared by the same call via the SSR adapter.
  await supabase.auth.signOut({ scope: 'global' });

  redirect('/login?notice=password_updated');
}

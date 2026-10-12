'use server';

/**
 * Server Action for the admin sign-in form.
 *
 * Phase 2 pivot (ADR-0040): apps/admin owns its own login (per-app auth).
 * Email + password only; the phone-OTP go/no-go requires a real-SIM
 * delivery test against MTN/Orange before we expose that login mode.
 *
 * Per ADR-0033 the Server Action is a thin envelope: input parsing,
 * one Supabase call, redirect on success, generic error envelope on
 * failure. There is no policy check here — Supabase Auth IS the policy
 * for "are these credentials valid." The Edge-Function authority model
 * applies to business writes; auth itself is the foundation underneath.
 *
 * Error messages are intentionally generic ("Invalid email or password")
 * for both wrong-password AND unknown-email cases — leaking which input
 * was wrong gives an attacker an account-enumeration oracle.
 */

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { serverEnv } from '@shesa/config/env.server';
import { emailSchema } from '@shesa/domain/validators';

import { getServerClient } from '@/lib/supabase-server';
import { safeRedirect } from '@/lib/safe-redirect';

export interface SignInState {
  readonly ok: boolean;
  readonly message?: string;
  /** Echo back the email so the user doesn't have to retype on failure. */
  readonly email?: string;
}

const signInSchema = z.object({
  email: emailSchema,
  // Supabase enforces min length on the auth API side too. Mirror the
  // 8-char floor here so we fail fast with a clear message rather than
  // round-tripping to Supabase to learn the password is too short.
  password: z.string().min(8, 'Password is too short.'),
  next: z.string().optional(),
});

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Please enter a valid email and password (8+ characters).',
      email: typeof formData.get('email') === 'string' ? String(formData.get('email')) : undefined,
    };
  }

  const { email, password, next } = parsed.data;
  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Collapse invalid-creds and unknown-user to the same message. Surface
    // the rate-limit case separately because the user actually needs to
    // know to stop retrying.
    const message =
      error.status === 429
        ? 'Too many attempts. Please wait a moment and try again.'
        : 'Invalid email or password.';

    console.error(
      JSON.stringify({
        level: 'warn',
        component: 'admin.auth.signIn',
        message: 'signInWithPassword failed',
        status: error.status,
        error: error.message,
      }),
    );

    return { ok: false, message, email };
  }

  // Success — cookie was written by the @supabase/ssr setAll callback.
  // `redirect()` throws a special signal that Next catches at the action
  // boundary; nothing after it executes. Landing at `/` triggers the
  // persona resolver in apps/admin/src/app/page.tsx.
  redirect(safeRedirect(next, serverEnv.APP_BASE_DOMAIN));
}

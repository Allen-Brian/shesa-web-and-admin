'use client';

/**
 * Login form — client component so `useActionState` can drive the
 * pending + error state without a full page reload.
 *
 * Styling is intentionally minimal HTML + Tailwind tokens (no shadcn
 * yet — E11 brings the real component library). The shape lands first
 * so we can verify the flow end-to-end; the visual polish replaces
 * these tags one-for-one when shadcn's <Input>, <Button>, <Form> arrive.
 */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { signIn, type SignInState } from './actions';

const INITIAL: SignInState = { ok: true };

interface LoginFormProps {
  readonly next: string;
  /** Pre-filled email when the user landed here after, e.g., a reset flow. */
  readonly initialEmail?: string;
}

export function LoginForm({ next, initialEmail }: LoginFormProps) {
  const [state, formAction] = useActionState(signIn, INITIAL);
  const emailValue = state.email ?? initialEmail ?? '';

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={emailValue}
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <a
            href="/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {state.ok === false && state.message ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  );
}

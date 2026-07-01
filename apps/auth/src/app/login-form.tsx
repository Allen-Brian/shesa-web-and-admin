'use client';

/**
 * Login form — client component so `useActionState` can drive the
 * pending + error state without a full page reload.
 */

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button, Input, Label } from '@shesa/ui';

import { signIn, type SignInState } from './actions';

const INITIAL: SignInState = { ok: true };

interface LoginFormProps {
  readonly next: string;
  readonly initialEmail?: string;
}

export function LoginForm({ next, initialEmail }: LoginFormProps) {
  const [state, formAction] = useActionState(signIn, INITIAL);
  const emailValue = state.email ?? initialEmail ?? '';

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={emailValue}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Password</Label>
          <a
            href="/forgot-password"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
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
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  );
}

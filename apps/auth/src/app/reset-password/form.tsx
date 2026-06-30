'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { updatePassword, type ResetPasswordState } from './actions';

const INITIAL: ResetPasswordState = { ok: true };

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm" className="block text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
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
      {pending ? 'Updating…' : 'Update password'}
    </button>
  );
}

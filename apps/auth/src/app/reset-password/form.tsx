'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button, Input, Label } from '@shesa/ui';

import { updatePassword, type ResetPasswordState } from './actions';

const INITIAL: ResetPasswordState = { ok: true };

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(updatePassword, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
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
      {pending ? 'Updating…' : 'Update password'}
    </Button>
  );
}

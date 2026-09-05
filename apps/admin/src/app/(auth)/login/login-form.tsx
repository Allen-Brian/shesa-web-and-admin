'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';

import { Button, Input, Label, toast } from '@shesa/ui';

import { signIn, type SignInState } from './login-actions';

const INITIAL: SignInState = { ok: true };

interface LoginFormProps {
  readonly next: string;
  readonly initialEmail?: string;
}

export function LoginForm({ next, initialEmail }: LoginFormProps) {
  const [state, formAction] = useActionState(signIn, INITIAL);
  const [showPw, setShowPw] = useState(false);
  const emailValue = state.email ?? initialEmail ?? '';
  const lastMessageRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.ok !== false || !state.message) return;
    // Toast every time the action returns a new failure — including the
    // same message twice in a row (`useActionState` returns a fresh
    // state object each call so this useEffect re-runs).
    if (lastMessageRef.current !== state.message) {
      lastMessageRef.current = state.message;
    }
    toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={emailValue}
          placeholder="Enter email address"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            required
            minLength={8}
            placeholder="Enter password"
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Need help?</span>
        <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} disabled={pending} className="w-full">
      {pending ? 'Signing in…' : 'Sign in to your account'}
    </Button>
  );
}

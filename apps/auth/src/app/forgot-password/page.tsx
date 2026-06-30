import Link from 'next/link';

import { ForgotPasswordForm } from './form';

export const metadata = {
  title: 'Shesa — Reset password',
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the email tied to your Shesa account and we&apos;ll send a reset link.
          </p>
        </header>

        <ForgotPasswordForm />

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

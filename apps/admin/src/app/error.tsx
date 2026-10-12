'use client';

import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@shesa/ui';

/**
 * Admin error boundary. An operator needs two things a visitor does
 * not: a way to retry without losing their place, and the error digest
 * — the only handle on the server-side stack, which Next withholds from
 * the browser in production. Quoting it in a bug report is the
 * difference between a fixable report and "the page broke".
 */
export default function Error({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'admin.error-boundary',
        message: error.message,
        digest: error.digest,
      }),
    );
  }, [error]);

  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </span>

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Error
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">This screen failed to load</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Nothing you were working on has been lost. Retrying reloads just this screen; if it fails
          again, send the reference below to whoever maintains the portal.
        </p>

        {error.digest && (
          <p className="mt-5 rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {error.digest}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button type="button" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/">Back to the dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

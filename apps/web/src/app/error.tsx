'use client';

import { useEffect } from 'react';

import { MessageScreen, ScreenSecondaryLink } from '@/components/ui/message-screen';

/**
 * Route-level error boundary for the public site. Next renders this in
 * place of the page when a server or client render throws.
 *
 * `reset()` re-renders the segment, which is the right first move for a
 * transient failure (a dropped database call, a cold function) and
 * costs the visitor nothing when it is not.
 */
export default function Error({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next
    // withholds from the browser in production.
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.error-boundary',
        message: error.message,
        digest: error.digest,
      }),
    );
  }, [error]);

  return (
    <MessageScreen
      code="500"
      eyebrow="Something went wrong"
      title={
        <>
          That did not load as <span className="italic text-primary">planned.</span>
        </>
      }
      body="Our end, not yours. Try again in a moment — if it keeps happening, let us know and we will chase it down."
    >
      <button
        type="button"
        onClick={reset}
        className="group inline-flex items-center gap-3 rounded-xs bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.6)] transition-transform duration-500 hover:-translate-y-0.5"
      >
        <span>Try again</span>
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:rotate-90"
        >
          ↻
        </span>
      </button>
      <ScreenSecondaryLink href="/">Back to the home page</ScreenSecondaryLink>
    </MessageScreen>
  );
}

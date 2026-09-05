import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

import { Button } from '@shesa/ui';

/**
 * Admin 404. Deliberately plain: this is a working tool, so the page
 * says what happened, offers the way back, and gets out of the way —
 * no full-bleed artwork like the public site's.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-16">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-muted text-muted-foreground">
          <FileQuestion className="h-5 w-5" />
        </span>

        <p className="mt-6 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This screen does not exist, or you no longer have access to it. If you followed a link
          from inside the portal, it is worth telling whoever sent it.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild size="sm">
            <Link href="/">Go to the dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

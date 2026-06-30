/**
 * Public landing page — Phase 0 placeholder.
 *
 * The real homepage + CMS-rendered content lands in Phase 5 (CMS). For
 * now this page proves the shell boots, the shared tokens render, and
 * the cross-app cookie set by apps/auth is visible here when the user
 * is logged in (footer state below).
 */

import { appUrls } from '@shesa/config/urls';

import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6 rounded-lg border border-border bg-card p-8 text-card-foreground shadow-sm">
        <header className="space-y-1 text-center">
          <h1 className="text-3xl font-semibold">Shesa</h1>
          <p className="text-sm text-muted-foreground">Public website — Phase 0 placeholder</p>
        </header>

        <p className="text-sm text-muted-foreground">
          This is the public-facing shell. The homepage + member directory + CMS-rendered
          announcements land in Phase 5; for now we just confirm the app boots, the shared design
          tokens render, and the apex-domain session cookie is readable here.
        </p>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          {user ? (
            <>
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </>
          ) : (
            <>
              Not signed in.{' '}
              <a className="underline-offset-4 hover:underline" href={appUrls.auth}>
                Sign in at auth.shesa
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

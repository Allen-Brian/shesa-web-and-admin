/**
 * Public landing page — Phase 0 placeholder.
 *
 * The real homepage + CMS-rendered content lands in Phase 5 (CMS). For
 * now this page proves the shell boots, the shared tokens render, and
 * the cross-app cookie set by apps/auth is visible here when the user
 * is logged in (footer state below).
 */

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@shesa/ui';
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
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle>Shesa</CardTitle>
          <CardDescription>Public website — Phase 0 placeholder</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is the public-facing shell. The homepage + member directory + CMS-rendered
            announcements land in Phase 5; for now we just confirm the app boots, the shared design
            tokens render, and the apex-domain session cookie is readable here.
          </p>
        </CardContent>
        <CardFooter>
          <div className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
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
        </CardFooter>
      </Card>
    </main>
  );
}

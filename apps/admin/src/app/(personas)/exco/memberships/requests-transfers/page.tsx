import { redirect } from 'next/navigation';

import { ScopePicker } from '@/components/memberships/scope-picker';
import { resolveMemberableScopes } from '@/lib/memberships/memberable-scopes';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function RequestsTransfersLandingPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco/memberships/requests-transfers');

  const scopes = await resolveMemberableScopes(supabase, user.id);

  // Batches don't hold requests/transfers. Filter to the applicable subset
  // for the single-scope auto-redirect decision; the picker itself still
  // renders every scope and greys out the batches for context.
  const applicableScopes = scopes.filter(
    (s) => s.scope_type === 'branch' || s.scope_type === 'chapter',
  );

  if (applicableScopes.length === 0 && scopes.length === 0) {
    return <EmptyState />;
  }

  if (applicableScopes.length === 1) {
    redirect(`/exco/memberships/requests-transfers/${applicableScopes[0]!.slug}`);
  }

  return (
    <ScopePicker
      persona="exco"
      subItem="requests-transfers"
      scopes={scopes}
      title="Requests & Transfers"
      subtitle="Pick the branch or autonomous chapter whose queue you want to work through."
    />
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="max-w-md rounded-xl border border-dashed border-border p-8 text-center">
        <h1 className="text-lg font-semibold text-foreground">No memberships to manage</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You don&apos;t have a membership admin role at any branch or autonomous chapter. Ask a
          mainstream admin to grant you a role.
        </p>
      </div>
    </div>
  );
}

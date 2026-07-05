import { redirect } from 'next/navigation';

import { ScopePicker } from '@/components/memberships/scope-picker';
import { resolveMemberableScopes } from '@/lib/memberships/memberable-scopes';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function ManageMembershipLandingPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco/memberships/manage');

  const scopes = await resolveMemberableScopes(supabase, user.id);

  if (scopes.length === 0) return <EmptyState />;
  if (scopes.length === 1) redirect(`/exco/memberships/manage/${scopes[0]!.slug}`);

  return (
    <ScopePicker
      persona="exco"
      section="memberships/manage"
      scopes={scopes}
      title="Manage Membership"
      subtitle="Pick the branch or autonomous chapter whose requests, transfers, and registration you want to work through."
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

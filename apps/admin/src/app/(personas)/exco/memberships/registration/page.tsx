import { redirect } from 'next/navigation';

import { ScopePicker } from '@/components/memberships/scope-picker';
import { resolveMemberableScopes } from '@/lib/memberships/memberable-scopes';
import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function RegistrationLandingPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco/memberships/registration');

  const scopes = await resolveMemberableScopes(supabase, user.id);

  const applicableScopes = scopes.filter(
    (s) => s.scope_type === 'branch' || s.scope_type === 'chapter',
  );

  if (applicableScopes.length === 0 && scopes.length === 0) {
    return <EmptyState />;
  }

  if (applicableScopes.length === 1) {
    redirect(`/exco/memberships/registration/${applicableScopes[0]!.slug}`);
  }

  return (
    <ScopePicker
      persona="exco"
      subItem="registration"
      scopes={scopes}
      title="Registration"
      subtitle="Pick the branch or autonomous chapter whose registration you want to review."
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

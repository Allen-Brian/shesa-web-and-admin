import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import type { ScopeOption } from '@/app/(personas)/finance/contributions/widgets/contributions-types';
import { activeFinanceScope } from '@/lib/finance/active-scope';
import { loadGroupBySlug, loadGroupContributions } from '@/lib/finance/groups/load-group';
import { getServerClient } from '@/lib/supabase-server';

import { GroupHero } from './widgets/group-hero';
import { GroupNewContribution } from './widgets/group-new-contribution';
import { GroupSubNav } from './widgets/group-sub-nav';

export const dynamic = 'force-dynamic';

interface GroupLayoutProps {
  readonly params: Promise<{ slug: string }>;
  readonly children: ReactNode;
}

interface RawScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
  readonly currency_code: string;
}

/**
 * Per-group shell — hero + sub-nav wrapping every /finance/groups/[slug]/*
 * sub-page. Loads the group once here so sub-pages don't each re-resolve
 * the slug; the sub-nav also carries the dynamic Contribution tabs +
 * an "Add contribution" trigger so operators can pin new ticketed /
 * fixed charges to the group without leaving the shell.
 */
export default async function GroupLayout({ params, children }: GroupLayoutProps) {
  const { slug } = await params;
  const group = await loadGroupBySlug(slug);
  if (!group) notFound();
  const contributions = await loadGroupContributions(group.id);

  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const active = user ? await activeFinanceScope(user.id) : null;

  // Contributions inside a group land at the group's own scope (which
  // is mainstream by definition). We still hydrate a scopeOptions list
  // so the reused mainstream dialog has non-empty currency lookup.
  const { data: scopeRows } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, slug, scope_type, chapter_kind, currency_code')
    .eq('id', group.scopeId)
    .maybeSingle();
  const raw = (scopeRows as RawScopeRow | null) ?? null;
  const scopeOptions: ScopeOption[] = raw
    ? [{ id: raw.id, name: raw.name, slug: raw.slug, currency: raw.currency_code }]
    : [];
  const defaultScopeId = active?.scopeIds[0] ?? group.scopeId;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <GroupHero group={group} />
      <GroupSubNav
        slug={group.slug}
        contributions={contributions}
        trailing={
          <GroupNewContribution
            groupId={group.id}
            defaultScopeId={defaultScopeId}
            scopeOptions={scopeOptions}
          />
        }
      />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

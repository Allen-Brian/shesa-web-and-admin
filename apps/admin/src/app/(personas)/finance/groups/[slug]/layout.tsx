import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { loadGroupBySlug, loadGroupContributions } from '@/lib/finance/groups/load-group';

import { GroupHero } from './widgets/group-hero';
import { GroupSubNav } from './widgets/group-sub-nav';

export const dynamic = 'force-dynamic';

interface GroupLayoutProps {
  readonly params: Promise<{ slug: string }>;
  readonly children: ReactNode;
}

/**
 * Per-group shell — hero + sub-nav wrapping every /finance/groups/[slug]/*
 * sub-page. Loads the group once here so sub-pages don't each re-resolve
 * the slug; the dynamic Contributions row on the sub-nav also resolves
 * from the group's charges here.
 */
export default async function GroupLayout({ params, children }: GroupLayoutProps) {
  const { slug } = await params;
  const group = await loadGroupBySlug(slug);
  if (!group) notFound();
  const contributions = await loadGroupContributions(group.id);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <GroupHero group={group} />
      <GroupSubNav slug={group.slug} contributions={contributions} />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

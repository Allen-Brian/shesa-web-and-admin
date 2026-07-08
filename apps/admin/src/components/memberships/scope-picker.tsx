import Link from 'next/link';
import { Building2, Landmark } from 'lucide-react';

import type { MemberableScope } from '@/lib/memberships/memberable-scopes';

interface ScopePickerProps {
  readonly persona: string;
  /**
   * Route section under `/persona/{section}/{slug}`. Existing consumers
   * pass `memberships/members` or `memberships/manage`; the Settings
   * landing passes `settings`.
   */
  readonly section: string;
  readonly scopes: readonly MemberableScope[];
  readonly title: string;
  readonly subtitle: string;
}

/**
 * Shared scope-picker for the Memberships + Settings landings. Groups
 * scopes by type (branches vs autonomous chapters). Batches are no
 * longer memberable — they became a cluster-only filter in the
 * 2026-07-05 batch-admin drop.
 */
export function ScopePicker({ persona, section, scopes, title, subtitle }: ScopePickerProps) {
  const branches = scopes.filter((s) => s.scope_type === 'branch');
  const chapters = scopes.filter(
    (s) => s.scope_type === 'chapter' && s.chapter_kind === 'autonomous',
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {branches.length > 0 && (
        <Section label="Branches" Icon={Building2}>
          {branches.map((s) => (
            <ScopeCard
              key={s.id}
              href={`/${persona}/${section}/${s.slug}`}
              name={s.name}
              slug={s.slug}
            />
          ))}
        </Section>
      )}

      {chapters.length > 0 && (
        <Section label="Autonomous chapters" Icon={Landmark}>
          {chapters.map((s) => (
            <ScopeCard
              key={s.id}
              href={`/${persona}/${section}/${s.slug}`}
              name={s.name}
              slug={s.slug}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  label,
  Icon,
  children,
}: {
  readonly label: string;
  readonly Icon: typeof Building2;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function ScopeCard({
  href,
  name,
  slug,
}: {
  readonly href: string;
  readonly name: string;
  readonly slug: string;
}) {
  return (
    <Link href={href}>
      <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-primary/5">
        <div className="text-sm font-medium text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground">{slug}</div>
      </div>
    </Link>
  );
}

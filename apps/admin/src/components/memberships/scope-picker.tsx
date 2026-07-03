import Link from 'next/link';
import { Building2, GraduationCap, Landmark } from 'lucide-react';

import type { MemberableScope } from '@/lib/memberships/memberable-scopes';

interface ScopePickerProps {
  readonly persona: string;
  /** Sub-item slug: 'members' | 'requests-transfers' | 'registration'. */
  readonly subItem: 'members' | 'requests-transfers' | 'registration';
  readonly scopes: readonly MemberableScope[];
  readonly title: string;
  readonly subtitle: string;
}

/**
 * Shared scope-picker for the three Memberships landing pages. Groups
 * scopes by type (branches, autonomous chapters, batches) and shows a
 * "not-applicable" hint on batches when the caller sub-item is
 * requests-transfers or registration.
 */
export function ScopePicker({ persona, subItem, scopes, title, subtitle }: ScopePickerProps) {
  const branches = scopes.filter((s) => s.scope_type === 'branch');
  const chapters = scopes.filter(
    (s) => s.scope_type === 'chapter' && s.chapter_kind === 'autonomous',
  );
  const batches = scopes.filter((s) => s.scope_type === 'batch');

  const batchesApplicable = subItem === 'members';

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
              href={`/${persona}/memberships/${subItem}/${s.slug}`}
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
              href={`/${persona}/memberships/${subItem}/${s.slug}`}
              name={s.name}
              slug={s.slug}
            />
          ))}
        </Section>
      )}

      {batches.length > 0 && (
        <Section
          label="Batches"
          Icon={GraduationCap}
          note={
            batchesApplicable
              ? undefined
              : "Batches carry members only — Requests & Transfers and Registration don't apply."
          }
        >
          {batches.map((s) => (
            <ScopeCard
              key={s.id}
              href={batchesApplicable ? `/${persona}/memberships/${subItem}/${s.slug}` : undefined}
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
  note,
  children,
}: {
  readonly label: string;
  readonly Icon: typeof Building2;
  readonly note?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
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
  readonly href: string | undefined;
  readonly name: string;
  readonly slug: string;
}) {
  const body = (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-primary/5">
      <div className="text-sm font-medium text-foreground">{name}</div>
      <div className="font-mono text-xs text-muted-foreground">{slug}</div>
    </div>
  );
  if (!href) {
    return (
      <div className="cursor-not-allowed opacity-50" aria-disabled>
        {body}
      </div>
    );
  }
  return <Link href={href}>{body}</Link>;
}

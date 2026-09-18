import Link from 'next/link';

/**
 * The three views of the same pile of nominations, in the order the work
 * happens: what came in, who it adds up to, and who ends up on the paper.
 */
const TABS = [
  { key: 'nominations', href: '/editor/voting/nominations', label: 'Nominations' },
  { key: 'nominees', href: '/editor/voting/nominees', label: 'Nominees' },
  { key: 'candidates', href: '/editor/voting/candidates', label: 'The ballot' },
] as const;

export function VotingTabs({ active }: { readonly active: (typeof TABS)[number]['key'] }) {
  return (
    <nav className="flex gap-1 border-b">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
            t.key === active
              ? 'border-primary font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

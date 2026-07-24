'use client';

interface Props {
  readonly page: number;
  readonly totalPages: number;
  readonly onPage: (page: number) => void;
}

/**
 * Pagination controls under the reader's left list. Prev + numbered
 * pages + Next; disabled endpoints go dim. Kept simple, the list is
 * short enough that showing every page number is friendlier than
 * ellipses for the SHESA site's scale.
 */
export function Pagination({ page, totalPages, onPage }: Props) {
  return (
    <nav
      aria-label="News pagination"
      className="mt-6 flex flex-wrap items-center justify-center gap-1.5 border-t border-black/8 pt-6"
    >
      <PageButton disabled={page === 1} onClick={() => onPage(page - 1)}>
        ← Prev
      </PageButton>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <PageButton key={n} active={n === page} onClick={() => onPage(n)}>
          {n}
        </PageButton>
      ))}
      <PageButton disabled={page === totalPages} onClick={() => onPage(page + 1)}>
        Next →
      </PageButton>
    </nav>
  );
}

function PageButton({
  active,
  disabled,
  onClick,
  children,
}: {
  readonly active?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-xs border px-2 font-heading text-xs transition-colors ${
        active
          ? 'border-primary bg-primary text-white'
          : 'border-black/12 bg-white text-black/70 hover:border-primary/40 hover:text-primary'
      } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-black/12 disabled:hover:text-black/70`}
    >
      {children}
    </button>
  );
}

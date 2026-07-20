import type { AgmTicketStatus } from './types';

interface Props {
  readonly status: AgmTicketStatus;
}

const STATUS_STYLES: Record<
  AgmTicketStatus,
  { readonly label: string; readonly bg: string; readonly fg: string }
> = {
  issued: {
    label: 'Issued',
    bg: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
    fg: 'var(--color-primary)',
  },
  paid: {
    label: 'Paid',
    bg: 'rgba(28, 122, 60, 0.12)',
    fg: '#1c7a3c',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'rgba(120, 20, 20, 0.12)',
    fg: '#8a1a1a',
  },
};

/** Coloured pill for a ticket status. Kept per-surface, no shared dep. */
export function AgmStatusBadge({ status }: Props) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.16em]"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

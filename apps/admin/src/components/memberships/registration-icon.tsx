import { CircleDashed } from 'lucide-react';

import { IconChecked, IconWarning, cn } from '@shesa/ui';

type RegistrationState = 'not_required' | 'pending' | 'paid' | 'paid_on_behalf' | 'waived';

interface RegistrationIconProps {
  readonly state: RegistrationState | string | null;
  readonly showLabel?: boolean;
  readonly size?: number;
  readonly className?: string;
}

const LABELS: Record<RegistrationState, string> = {
  not_required: 'Not required',
  pending: 'Pending',
  paid: 'Paid',
  paid_on_behalf: 'Paid on behalf',
  waived: 'Waived',
};

/**
 * Registration state rendered as icon + optional label.
 *   paid / paid_on_behalf → IconChecked (green)
 *   waived                → IconChecked (green) — also a settled state
 *   pending               → IconWarning (amber)
 *   not_required          → dashed circle (neutral)
 *   unknown               → dashed circle (neutral)
 *
 */
export function RegistrationIcon({
  state,
  showLabel = true,
  size = 16,
  className,
}: RegistrationIconProps) {
  if (!state || !(state in LABELS)) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-muted-foreground', className)}>
        <CircleDashed style={{ width: size, height: size }} />
        {showLabel && <span className="text-sm">—</span>}
      </span>
    );
  }

  const key = state as RegistrationState;
  const label = LABELS[key];
  const Icon =
    key === 'paid' || key === 'paid_on_behalf' || key === 'waived'
      ? IconChecked
      : key === 'pending'
        ? IconWarning
        : null;

  if (!Icon) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-muted-foreground', className)}>
        <CircleDashed style={{ width: size, height: size }} />
        {showLabel && <span className="text-sm">{label}</span>}
      </span>
    );
  }

  const tone =
    key === 'pending'
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-emerald-700 dark:text-emerald-400';

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', tone, className)}
      title={label}
      aria-label={label}
    >
      <Icon size={size} />
      {showLabel && <span className="text-sm">{label}</span>}
    </span>
  );
}

import { Building2 } from 'lucide-react';

import { Private } from '@shesa/ui';

import type { MatrixRow } from './charge-detail-types';
import { formatMoney, getInitials } from './shared-formatters';

/**
 * Left-most "who is this row?" cell in the matrix table. Renders
 * either the member's initials (individual rows) or a building icon
 * (scope-as-body rows), tinted red / green / neutral based on
 * outstanding balance.
 */
export function ChargeMatrixMemberCell({
  member,
  currency,
}: {
  readonly member: MatrixRow;
  readonly currency: string;
}) {
  const behind = (member._outstanding ?? 0) > 0.0001;
  const totallyPaid = (member._totalOwed ?? 0) > 0.0001 && (member._outstanding ?? 0) <= 0.0001;
  const isScopeBody = !!member.isScopeBody;
  const initials = getInitials(member.fullName);

  return (
    <div className="flex h-full items-center gap-2.5 py-1">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center text-xs font-medium ${
          isScopeBody ? 'rounded-md' : 'rounded-full'
        } ${
          behind
            ? 'bg-destructive/10 text-destructive'
            : totallyPaid
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {isScopeBody ? <Building2 className="h-4 w-4" /> : <Private>{initials}</Private>}
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <Private>
          <span
            className="block truncate text-sm font-medium text-foreground"
            title={member.fullName}
          >
            {member.fullName}
          </span>
        </Private>
        <span className="truncate text-[11px] text-muted-foreground tabular-nums">
          {isScopeBody && member.scopeType && (
            <span className="mr-1 capitalize italic">{member.scopeType} · as body ·</span>
          )}
          {formatMoney(member._totalPaid ?? 0, currency)} of{' '}
          {formatMoney(member._totalOwed ?? 0, currency)}
        </span>
      </div>
    </div>
  );
}

import { ScrollText } from 'lucide-react';

import type { AuditScope } from './audit-log-widget-types';

function scopeLabel(scopeType: AuditScope['scope_type']): string {
  if (scopeType === 'mainstream') return 'Mainstream';
  if (scopeType === 'chapter') return 'Autonomous chapter';
  return 'Branch';
}

export function AuditLogsHeader({
  scope,
  limit,
}: {
  readonly scope: AuditScope;
  readonly limit: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {scopeLabel(scope.scope_type)}
      </div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
        <ScrollText className="h-6 w-6" />
        Audit Logs
      </h1>
      <p className="text-sm text-muted-foreground">
        Last {limit} events at {scope.name}. Newest first. Click a row for the full payload.
      </p>
    </div>
  );
}

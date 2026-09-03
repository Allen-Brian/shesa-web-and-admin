import { Badge } from '@shesa/ui';

import { CATEGORY_META } from './audit-log-constants';
import { categorize } from './audit-log-helpers';

export function ActionCell({ action }: { readonly action: string }) {
  const cat = categorize(action);
  const meta = CATEGORY_META[cat];
  return (
    <span className="inline-flex h-full items-center gap-2">
      <span className="font-mono text-xs text-foreground">{action}</span>
      {meta.tone && (
        <Badge variant="outline" className={`${meta.tone} shrink-0`}>
          {meta.label}
        </Badge>
      )}
    </span>
  );
}

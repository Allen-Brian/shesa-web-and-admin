import { Badge } from '@shesa/ui';

import { humanizeType } from './list-helpers';

export function TypeCell({ types }: { readonly types: readonly string[] }) {
  if (types.length === 0) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  const first = types[0]!;
  const rest = types.length - 1;
  return (
    <span className="inline-flex h-full items-center gap-1">
      <Badge variant="outline" className="text-xs font-normal">
        {humanizeType(first)}
      </Badge>
      {rest > 0 && (
        <Badge variant="secondary" className="text-xs font-normal">
          +{rest}
        </Badge>
      )}
    </span>
  );
}

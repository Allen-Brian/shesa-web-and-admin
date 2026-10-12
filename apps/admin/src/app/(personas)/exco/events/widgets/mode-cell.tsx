import { MODE } from './list-constants';
import type { EventRow } from './list-types';

export function ModeCell({ mode }: { readonly mode: EventRow['mode'] }) {
  const desc = MODE[mode];
  const Icon = desc.icon;
  return (
    <span className="inline-flex h-full items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{desc.label}</span>
    </span>
  );
}

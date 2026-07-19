'use client';

import { AlertTriangle, Loader2, Users } from 'lucide-react';

import { AUDIENCE_ALL_LABEL, type AudienceDefinition, isAudienceAll } from '@shesa/domain/audience';
import { Badge } from '@shesa/ui';

export type ReachState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; count: number }
  | { status: 'error'; message: string };

interface AudienceReachPreviewProps {
  readonly state: ReachState;
  readonly audience: AudienceDefinition;
}

/**
 * Live reach preview shown at the top of the AudienceSelector.
 *
 * Redesigned from the "one-line 'name resolution failed'" bug — the
 * error state now renders in its own visually-distinct row (warning
 * icon + short human message) and the AUDIENCE_ALL badge is suppressed
 * during errors so the row doesn't stack conflicting signals.
 */
export function AudienceReachPreview({ state, audience }: AudienceReachPreviewProps) {
  if (state.status === 'error') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="font-medium">Preview unavailable.</span>
        <span className="text-xs text-amber-700/80 dark:text-amber-300/80">
          Reach will update when the connection is restored.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {state.status === 'loading' ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">Reaches</span>
        <span className="font-semibold">
          {state.status === 'loading' && '…'}
          {state.status === 'ok' && `~${state.count.toLocaleString()} members`}
          {state.status === 'idle' && '—'}
        </span>
      </div>
      {isAudienceAll(audience) && <Badge variant="outline">{AUDIENCE_ALL_LABEL}</Badge>}
    </div>
  );
}

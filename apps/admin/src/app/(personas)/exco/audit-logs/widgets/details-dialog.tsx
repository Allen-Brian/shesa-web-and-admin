'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@shesa/ui';

import { ActionCell } from './action-cell';
import { CopyButton } from './copy-button';
import { DetailCopyableField } from './detail-copyable-field';
import { DetailField } from './detail-field';
import type { AuditEntryRow } from './audit-log-widget-types';

export function DetailsDialog({
  entry,
  onClose,
}: {
  readonly entry: AuditEntryRow | null;
  readonly onClose: () => void;
}) {
  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <ActionCell action={entry.action} />
              </DialogTitle>
              <DialogDescription>
                {new Date(entry.created_at).toLocaleString()} · {entry.actor_label}
                {entry.actor_email && entry.actor_email !== entry.actor_label && (
                  <>
                    {' · '}
                    <span>{entry.actor_email}</span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField
                label="Entity"
                value={`${entry.entity_schema}.${entry.entity_table}`}
                mono
              />
              <DetailCopyableField label="Entity ID" value={entry.entity_id} />
              <DetailCopyableField label="IP" value={entry.ip_address} />
              <DetailCopyableField label="User Agent" value={entry.user_agent} truncate />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Metadata
                </div>
                <CopyButton value={JSON.stringify(entry.metadata, null, 2)} label="Copy JSON" />
              </div>
              <pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs">
                {JSON.stringify(entry.metadata, null, 2) || '{}'}
              </pre>
            </div>

            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

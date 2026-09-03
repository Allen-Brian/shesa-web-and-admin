'use client';

import { Download } from 'lucide-react';

import { Button } from '@shesa/ui';

import { categorize, downloadCsv } from './audit-log-helpers';
import type { AuditEntryRow } from './audit-log-widget-types';

export function ExportCsvButton({
  rows,
  scopeSlug,
  disabled,
}: {
  readonly rows: readonly AuditEntryRow[];
  readonly scopeSlug: string;
  readonly disabled?: boolean;
}) {
  const onExport = () => {
    const header = [
      'When',
      'Actor',
      'Actor email',
      'Action',
      'Category',
      'Entity',
      'Entity id',
      'IP',
      'Metadata',
    ];
    const csvRows: string[][] = rows.map((r) => [
      r.created_at,
      r.actor_label,
      r.actor_email ?? '',
      r.action,
      categorize(r.action),
      `${r.entity_schema}.${r.entity_table}`,
      r.entity_id ?? '',
      r.ip_address ?? '',
      JSON.stringify(r.metadata),
    ]);
    downloadCsv(`audit-logs-${scopeSlug}-${new Date().toISOString().slice(0, 10)}`, [
      header,
      ...csvRows,
    ]);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onExport}
      disabled={disabled || rows.length === 0}
      className="gap-1.5 h-8"
    >
      <Download className="h-3.5 w-3.5" />
      Export
    </Button>
  );
}

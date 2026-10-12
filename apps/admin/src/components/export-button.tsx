'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

import { exportToExcel, type ExportSpec } from '@/lib/export/workbook';

interface Props<T> {
  /**
   * Built at click time rather than passed as a value, so the export
   * always reflects the filters showing on screen at the moment the
   * operator asked for it.
   */
  readonly spec: () => ExportSpec<T>;
  readonly label?: string;
  readonly disabled?: boolean;
  readonly variant?: 'outline' | 'ghost' | 'default';
  readonly size?: 'sm' | 'default';
}

/**
 * "Export" for any Finance Portal table. Builds the formatted workbook
 * in the browser from the rows already on screen — the export matches
 * the filtered view, not the whole table, which is what an operator who
 * has just narrowed to one month expects to receive.
 *
 * ExcelJS loads on the first click, so the button shows a spinner for
 * the moment that takes on a cold cache.
 */
export function ExportButton<T>({
  spec,
  label = 'Export',
  disabled = false,
  variant = 'outline',
  size = 'sm',
}: Props<T>) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const built = spec();
      if (built.rows.length === 0) {
        toast.info('Nothing to export — no rows match the current filters.');
        return;
      }
      const written = await exportToExcel(built);
      toast.success(`Exported ${written} ${written === 1 ? 'row' : 'rows'} to Excel.`);
    } catch {
      toast.error('Export failed. Try again, or narrow the filters if the table is very large.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={run} disabled={disabled || busy}>
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}

'use client';

import { type ReactNode, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@shesa/ui';

import { TaxonomyRowCreator } from './taxonomy-row-creator';
import { TaxonomyRowEditor } from './taxonomy-row-editor';
import type { TaxonomyActions, TaxonomyDraft, TaxonomyRow } from './taxonomy-types';

interface Props<T extends TaxonomyRow> {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly rows: readonly T[];
  /** Singular, capitalised — "Category", "Sector". Drives every string below. */
  readonly noun: string;
  readonly title: string;
  readonly description: ReactNode;
  /** Spelled out per row, so a cascade can name what it takes with it. */
  readonly deleteDescription: (row: T) => string;
  readonly actions: TaxonomyActions;
  readonly nameMaxLength?: number;
  /**
   * Supply to give each row a second free-text field. Absent means the
   * taxonomy is name-only, which is the case for all four category
   * surfaces and for organ sectors.
   */
  readonly captionOf?: (row: T) => string;
  readonly captionPlaceholder?: string;
}

/**
 * Compact CRUD for a taxonomy, launched from a surface's toolbar or its
 * form. These lists are small (a handful of entries) so a full DataTable
 * would be overkill; a stacked editable list is the right density.
 */
export function TaxonomyManagerDialog<T extends TaxonomyRow>({
  open,
  onOpenChange,
  rows,
  noun,
  title,
  description,
  deleteDescription,
  actions,
  nameMaxLength = 80,
  captionOf,
  captionPlaceholder,
}: Props<T>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<T | null>(null);

  const lower = noun.toLowerCase();
  const nextSort = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 10 : 10;

  const runSave = (id: string, draft: TaxonomyDraft) => {
    if (!draft.name.trim()) {
      toast.error(`${noun} name is required.`);
      return;
    }
    startTransition(async () => {
      const res = await actions.update(id, draft);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`${noun} renamed.`);
      router.refresh();
    });
  };

  const runCreate = (draft: TaxonomyDraft, reset: () => void) => {
    if (!draft.name.trim()) {
      toast.error(`${noun} name is required.`);
      return;
    }
    startTransition(async () => {
      const res = await actions.create({ ...draft, sortOrder: nextSort });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`${noun} created.`);
      reset();
      router.refresh();
    });
  };

  const runDelete = (row: T) => {
    startTransition(async () => {
      const res = await actions.remove(row.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`${noun} "${row.name}" removed.`);
      setConfirm(null);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The caption field needs the extra width to stay readable. */}
      <DialogContent className={captionOf ? 'max-w-lg' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <TaxonomyRowEditor
              key={row.id}
              row={row}
              noun={noun}
              nameMaxLength={nameMaxLength}
              caption={captionOf?.(row)}
              captionPlaceholder={captionPlaceholder}
              onSave={runSave}
              onDelete={() => setConfirm(row)}
              pending={pending}
            />
          ))}
          <TaxonomyRowCreator
            noun={noun}
            nameMaxLength={nameMaxLength}
            withCaption={!!captionOf}
            captionPlaceholder={captionPlaceholder}
            onCreate={runCreate}
            pending={pending}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>

        <ConfirmDialog
          open={!!confirm}
          title={confirm ? `Delete "${confirm.name}"?` : ''}
          description={confirm ? deleteDescription(confirm) : ''}
          confirmLabel={`Delete ${lower}`}
          onConfirm={() => confirm && runDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      </DialogContent>
    </Dialog>
  );
}

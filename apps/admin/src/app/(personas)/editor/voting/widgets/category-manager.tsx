'use client';

import { Button, ConfirmDialog, Input, toast } from '@shesa/ui';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { deleteCategory, saveCategory } from '../actions/voting-actions';
import type { CategoryRow } from '../voting-types';

/**
 * The headings awards are grouped under.
 *
 * Deleting one does not delete its awards — they become standalone, which
 * is a real state rather than an accident: Branch Leadership and Country
 * Chapter Leadership have no parent heading on purpose.
 */
export function CategoryManager({
  editionId,
  categories,
}: {
  readonly editionId: string;
  readonly categories: readonly CategoryRow[];
}) {
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [removing, setRemoving] = useState<CategoryRow | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error(res.message ?? 'That did not work.');
    });

  return (
    <div className="flex flex-col gap-3">
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories. Awards added without one stand alone, which is fine for a ceremony of a few
          awards.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2"
            >
              {editing?.id === c.id ? (
                <>
                  <Input
                    value={editing.value}
                    onChange={(e) => setEditing({ id: c.id, value: e.target.value })}
                    className="h-8 w-[280px]"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const res = await saveCategory(
                          c.id,
                          editionId,
                          editing.value,
                          c.description,
                          c.sortOrder,
                        );
                        if (res.ok) setEditing(null);
                        return res;
                      }, 'Renamed.')
                    }
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  {c.description && (
                    <span className="text-xs text-muted-foreground">{c.description}</span>
                  )}
                  <div className="ml-auto flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing({ id: c.id, value: c.name })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setRemoving(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && adding.trim().length >= 2) {
              e.preventDefault();
              run(async () => {
                const res = await saveCategory(
                  null,
                  editionId,
                  adding,
                  null,
                  categories.length + 1,
                );
                if (res.ok) setAdding('');
                return res;
              }, 'Category added.');
            }
          }}
          placeholder="Add a category"
          className="w-[280px]"
          maxLength={160}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending || adding.trim().length < 2}
          onClick={() =>
            run(async () => {
              const res = await saveCategory(null, editionId, adding, null, categories.length + 1);
              if (res.ok) setAdding('');
              return res;
            }, 'Category added.')
          }
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ConfirmDialog
        open={removing !== null}
        title={`Delete the "${removing?.name ?? ''}" category?`}
        description="Its awards are kept and become standalone — nothing is lost, they just stop being grouped under this heading."
        confirmLabel="Delete"
        onConfirm={() => {
          const target = removing;
          setRemoving(null);
          if (target) run(() => deleteCategory(target.id), 'Category deleted.');
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

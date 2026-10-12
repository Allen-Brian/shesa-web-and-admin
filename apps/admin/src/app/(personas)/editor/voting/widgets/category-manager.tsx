'use client';

import { Button, ConfirmDialog, Input, Textarea, toast } from '@shesa/ui';
import { FolderTree, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { deleteCategory, saveCategory } from '../actions/voting-actions';
import type { AwardRow, CategoryRow } from '../voting-types';

interface Draft {
  readonly id: string | null;
  name: string;
  description: string;
}

/**
 * The headings awards are grouped under.
 *
 * Each row carries how many awards sit under it, because that is the only
 * thing that makes one category different from another here — a heading with
 * nothing beneath it is an empty section on the public page, and a heading
 * with twelve is the one people are looking for.
 *
 * Deleting never deletes awards: they become standalone, which is a real
 * state rather than an accident. Branch Leadership and Country Chapter
 * Leadership have no parent heading on purpose.
 */
export function CategoryManager({
  editionId,
  categories,
  awards = [],
}: {
  readonly editionId: string;
  readonly categories: readonly CategoryRow[];
  readonly awards?: readonly AwardRow[];
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState<CategoryRow | null>(null);
  const [pending, startTransition] = useTransition();

  const awardCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of awards) {
      if (!a.categoryId) continue;
      m.set(a.categoryId, (m.get(a.categoryId) ?? 0) + 1);
    }
    return m;
  }, [awards]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error(res.message ?? 'That did not work.');
    });

  const save = () => {
    if (!draft) return;
    if (draft.name.trim().length < 2) {
      toast.error('A category needs a name.');
      return;
    }
    run(
      async () => {
        const res = await saveCategory(
          draft.id,
          editionId,
          draft.name,
          draft.description.trim() || null,
          categories.length + 1,
        );
        if (res.ok) setDraft(null);
        return res;
      },
      draft.id ? 'Category updated.' : 'Category added.',
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {categories.length === 0 && !draft ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center">
          <FolderTree className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">No categories</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Awards added without one stand alone, which is fine for a ceremony of a few awards. Add
            a category when a set of them belongs under a shared heading.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="w-24 px-3 py-2 text-right font-medium">Awards</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const n = awardCount.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="border-t align-top">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{c.name}</p>
                      {c.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs leading-[1.45] text-muted-foreground">
                          {c.description}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs italic text-muted-foreground">
                          No description
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={
                          n === 0
                            ? 'text-xs text-muted-foreground'
                            : 'text-sm font-medium tabular-nums text-foreground'
                        }
                      >
                        {n}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={`Edit ${c.name}`}
                          onClick={() =>
                            setDraft({
                              id: c.id,
                              name: c.name,
                              description: c.description ?? '',
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label={`Delete ${c.name}`}
                          onClick={() => setRemoving(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* One editor for both adding and renaming — the fields are identical,
          and a separate add form drifts from the edit form the first time
          one of them gains a field. */}
      {draft ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {draft.id ? 'Edit category' : 'New category'}
          </p>

          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Professional Leadership Awards"
            maxLength={160}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') setDraft(null);
              if (e.key === 'Enter') save();
            }}
          />

          <Textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="What this heading covers — shown under it on the public page."
            rows={2}
            maxLength={500}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              {pending ? 'Saving…' : draft.id ? 'Save changes' : 'Add category'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => setDraft({ id: null, name: '', description: '' })}
        >
          <Plus className="h-3.5 w-3.5" /> Add category
        </Button>
      )}

      <ConfirmDialog
        open={removing !== null}
        title={`Delete the “${removing?.name ?? ''}” category?`}
        description={
          (awardCount.get(removing?.id ?? '') ?? 0) > 0
            ? `Its ${awardCount.get(removing?.id ?? '')} award(s) are kept and become standalone — nothing is lost, they just stop being grouped under this heading.`
            : 'Nothing is grouped under it, so nothing else changes.'
        }
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

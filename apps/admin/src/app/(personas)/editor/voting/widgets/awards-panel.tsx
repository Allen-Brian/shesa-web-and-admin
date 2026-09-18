'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@shesa/ui';
import { ChevronRight, FolderTree, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { deleteAward, saveAward, saveCategory, type AwardInput } from '../actions/voting-actions';
import type { AwardRow, CategoryRow, EditionRow } from '../voting-types';

import { CategoryManager } from './category-manager';

const STANDALONE = '__standalone';
const NEW_CATEGORY = '__new';

/**
 * The awards, as a table you click into.
 *
 * Grouped by category because that is how the briefing groups them and how
 * the public page renders them — a flat alphabetical list would put
 * Agriculture next to Branch Leadership, which are different kinds of thing.
 *
 * A whole row is the link. The work for an award — reading its citations,
 * grouping its nominees, filling its ballot — needs a page, not a drawer.
 */
export function AwardsPanel({
  edition,
  categories,
  awards,
  emptyAwards,
}: {
  readonly edition: EditionRow;
  readonly categories: readonly CategoryRow[];
  readonly awards: readonly AwardRow[];
  readonly emptyAwards: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editing, setEditing] = useState<{ id: string | null; input: AwardInput } | null>(null);
  const [removing, setRemoving] = useState<AwardRow | null>(null);
  const [pending, startTransition] = useTransition();

  const base = `/editor/voting/${edition.slug}`;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return awards;
    const catName = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));
    return awards.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.categoryId ? (catName.get(a.categoryId) ?? '').includes(q) : false),
    );
  }, [awards, categories, query]);

  const groups = useMemo(() => {
    const out = categories
      .map((c) => ({
        key: c.id,
        heading: c.name,
        items: shown.filter((a) => a.categoryId === c.id),
      }))
      .filter((g) => g.items.length > 0);

    const standalone = shown.filter((a) => a.categoryId === null);
    if (standalone.length > 0) {
      out.push({ key: STANDALONE, heading: 'Standalone awards', items: standalone });
    }
    return out;
  }, [categories, shown]);

  const blank: AwardInput = {
    editionId: edition.id,
    categoryId: null,
    name: '',
    description: null,
    sortOrder: awards.length + 1,
    status: 'active',
  };

  const save = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveAward(editing.id, editing.input);
      if (res.ok) {
        toast.success(editing.id ? 'Award updated.' : 'Award added.');
        setEditing(null);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search awards…"
            className="w-[260px] pl-8"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="ml-auto"
          onClick={() => setManagingCategories((v) => !v)}
        >
          <FolderTree className="h-3.5 w-3.5" />
          Categories
          <span className="ml-1 text-xs text-muted-foreground">({categories.length})</span>
        </Button>

        <Button type="button" onClick={() => setEditing({ id: null, input: blank })}>
          <Plus className="h-3.5 w-3.5" /> Add award
        </Button>
      </div>

      {/* Categories live beside the awards they group rather than on another
          tab. They exist for no other purpose, and sending someone to a
          different screen to make one before they can finish adding an award
          is the trip this avoids. */}
      {managingCategories && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Categories</p>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Headings that group the awards below. An award can also stand alone — Branch and Country
            Chapter have no parent heading.
          </p>
          <CategoryManager editionId={edition.id} categories={categories} />
        </div>
      )}

      {/* An award with nobody on the ballot is dropped from the public
          ballot entirely. Finding that out from a voter is worse than
          finding it out here. */}
      {emptyAwards > 0 && edition.phase !== 'nominating' && edition.phase !== 'upcoming' && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
          <span className="font-medium text-foreground">
            {emptyAwards} {emptyAwards === 1 ? 'award has' : 'awards have'} nobody on the ballot.
          </span>{' '}
          <span className="text-muted-foreground">
            Voters are not shown an award with no candidates at all.
          </span>
        </div>
      )}

      {awards.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium text-foreground">No awards yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Add the awards this ceremony will present. Group them under a category from the
            Description tab, or leave them standalone.
          </p>
          <Button type="button" onClick={() => setEditing({ id: null, input: blank })}>
            <Plus className="h-3.5 w-3.5" /> Add award
          </Button>
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No award matches “{query}”.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <div key={g.key} className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.heading}
              </p>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Award</th>
                      <th className="px-3 py-2 text-right font-medium">Nominations</th>
                      <th className="px-3 py-2 text-right font-medium">Pending</th>
                      <th className="px-3 py-2 text-right font-medium">On the ballot</th>
                      <th className="w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((a) => (
                      <tr
                        key={a.id}
                        className="cursor-pointer border-t transition-colors hover:bg-muted/40"
                        onClick={() => router.push(`${base}/awards/${a.id}`)}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`${base}/awards/${a.id}`}
                              className="font-medium text-foreground hover:text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {a.name}
                            </Link>
                            {a.status === 'hidden' && (
                              <Badge className="bg-muted text-muted-foreground">Hidden</Badge>
                            )}
                          </div>
                          {a.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {a.description}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                          {a.nominationCount}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {a.pendingCount > 0 ? (
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              {a.pendingCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {a.candidateCount === 0 ? (
                            <span
                              className={
                                edition.phase === 'voting'
                                  ? 'font-medium text-destructive'
                                  : 'text-muted-foreground'
                              }
                            >
                              0
                            </span>
                          ) : (
                            <span className="font-medium text-foreground">{a.candidateCount}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditing({
                                  id: a.id,
                                  input: {
                                    editionId: edition.id,
                                    categoryId: a.categoryId,
                                    name: a.name,
                                    description: a.description,
                                    sortOrder: a.sortOrder,
                                    status: a.status,
                                  },
                                });
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRemoving(a);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit award' : 'Add award'}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="flex flex-col gap-4">
              <Field label="Name" required>
                <Input
                  value={editing.input.name}
                  onChange={(e) =>
                    setEditing({ ...editing, input: { ...editing.input, name: e.target.value } })
                  }
                  placeholder="Health Leadership Award"
                  maxLength={160}
                  autoFocus
                />
              </Field>

              <Field label="Category">
                <Select
                  value={
                    newCategory !== '' ? NEW_CATEGORY : (editing.input.categoryId ?? STANDALONE)
                  }
                  onValueChange={(v) => {
                    if (v === NEW_CATEGORY) {
                      // A placeholder space, so the select stays on "New
                      // category…" while the box below is still empty.
                      setNewCategory(' ');
                      return;
                    }
                    setNewCategory('');
                    setEditing({
                      ...editing,
                      input: { ...editing.input, categoryId: v === STANDALONE ? null : v },
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STANDALONE}>Standalone — no category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_CATEGORY}>New category…</SelectItem>
                  </SelectContent>
                </Select>

                {/* Created without leaving the dialog. Needing a category
                    that does not exist yet is the commonest reason to
                    abandon adding an award half-finished. */}
                {newCategory !== '' && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={newCategory.trimStart()}
                      onChange={(e) => setNewCategory(e.target.value || ' ')}
                      placeholder="Professional Leadership Awards"
                      maxLength={160}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pending || newCategory.trim().length < 2}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await saveCategory(
                            null,
                            edition.id,
                            newCategory.trim(),
                            null,
                            categories.length + 1,
                          );
                          if (res.ok) {
                            toast.success('Category created. Pick it from the list.');
                            setNewCategory('');
                          } else {
                            toast.error(res.message);
                          }
                        })
                      }
                    >
                      Create
                    </Button>
                  </div>
                )}
              </Field>

              <Field label="Description">
                <Textarea
                  value={editing.input.description ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      input: { ...editing.input, description: e.target.value },
                    })
                  }
                  rows={3}
                  maxLength={1000}
                  placeholder="For outstanding leadership and service in…"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Order">
                  <Input
                    value={editing.input.sortOrder}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        input: {
                          ...editing.input,
                          sortOrder: Number.parseInt(e.target.value.replace(/\D/g, ''), 10) || 0,
                        },
                      })
                    }
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Status">
                  <Select
                    value={editing.input.status}
                    onValueChange={(v) =>
                      setEditing({
                        ...editing,
                        input: { ...editing.input, status: v as AwardInput['status'] },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Visible</SelectItem>
                      <SelectItem value="hidden">Hidden from the public</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={save} disabled={pending}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        title={`Delete "${removing?.name ?? ''}"?`}
        description="An award that has already received nominations is refused — hide it instead, so the citations people wrote are kept."
        confirmLabel="Delete"
        onConfirm={() => {
          const target = removing;
          setRemoving(null);
          if (!target) return;
          startTransition(async () => {
            const res = await deleteAward(target.id);
            if (res.ok) toast.success('Award deleted.');
            else toast.error(res.message);
          });
        }}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  readonly label: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  EntityTablePanel,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
  type MassActions,
  type RowClickedEvent,
} from '@shesa/ui';
import { Eye, EyeOff, FolderTree, Pencil } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import {
  deleteAwards,
  saveAward,
  saveCategory,
  setAwardsStatus,
  type AwardInput,
} from '../actions/voting-actions';
import type { AwardRow, CategoryRow, EditionRow } from '../voting-types';

import { CategoryManager } from './category-manager';
import { CLAMPED_ROW_HEIGHT, serialColumn } from './clamped-cell';

const STANDALONE = '__standalone';
const NEW_CATEGORY = '__new';

/**
 * The awards, as a table you click into.
 *
 * Three numbers per row, and which one matters moves as the cycle does:
 * nominations while the form is open, people once they have been grouped,
 * candidates once the ballot is drawn. A row with nobody on the ballot is
 * called out, because such an award is dropped from the public ballot
 * entirely and finding that out from a voter is worse than finding it here.
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
  const [gridApi, setGridApi] = useState<GridApi<AwardRow> | null>(null);
  const [search, setSearch] = useState('');
  const [managingCategories, setManagingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editing, setEditing] = useState<{ id: string | null; input: AwardInput } | null>(null);
  const [confirm, setConfirm] = useState<readonly AwardRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  const base = `/editor/voting/${edition.slug}`;
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return awards;
    return awards.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.categoryId ? (categoryName.get(a.categoryId) ?? '').toLowerCase().includes(q) : false),
    );
  }, [awards, categoryName, search]);

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
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const columnDefs = useMemo<ColDef<AwardRow>[]>(
    () => [
      serialColumn<AwardRow>(),
      {
        headerName: 'Award',
        field: 'name',
        flex: 2,
        minWidth: 260,
        cellRenderer: (p: ICellRendererParams<AwardRow>) => {
          if (!p.data) return null;
          return (
            <span className="flex h-full flex-col justify-center leading-tight">
              <span className="flex items-center gap-2">
                <Link
                  href={`${base}/awards/${p.data.id}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {p.data.name}
                </Link>
                {p.data.status === 'hidden' && (
                  <Badge className="bg-muted text-muted-foreground">Hidden</Badge>
                )}
              </span>
              {p.data.description && (
                <span className="line-clamp-2 whitespace-normal break-words text-xs leading-[1.45] text-muted-foreground">
                  {p.data.description}
                </span>
              )}
            </span>
          );
        },
      },
      {
        headerName: 'Category',
        colId: 'category',
        flex: 1,
        minWidth: 180,
        valueGetter: (p) =>
          p.data?.categoryId ? (categoryName.get(p.data.categoryId) ?? '—') : 'Standalone',
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Nominations',
        field: 'nominationCount',
        width: 140,
        type: 'numericColumn',
      },
      {
        headerName: 'People',
        field: 'nomineeCount',
        width: 120,
        type: 'numericColumn',
      },
      {
        headerName: 'On the ballot',
        field: 'candidateCount',
        width: 150,
        type: 'numericColumn',
        cellRenderer: (p: ICellRendererParams<AwardRow, number>) => {
          if ((p.value ?? 0) > 0) {
            return <span className="font-medium text-foreground">{p.value}</span>;
          }
          // Only a problem once nominations have closed — before that, an
          // empty ballot is a cycle that has not got there yet.
          const urgent = edition.phase === 'voting' || edition.phase === 'review';
          return (
            <span className={urgent ? 'font-medium text-destructive' : 'text-muted-foreground'}>
              0
            </span>
          );
        },
      },
      {
        headerName: 'Order',
        field: 'sortOrder',
        width: 100,
        type: 'numericColumn',
        initialHide: true,
      },
      {
        headerName: '',
        colId: 'actions',
        width: 64,
        maxWidth: 64,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<AwardRow>) =>
          p.data ? (
            <span className="flex h-full items-center justify-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Edit award"
                onClick={(e) => {
                  e.stopPropagation();
                  const a = p.data as AwardRow;
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
            </span>
          ) : null,
      },
    ],
    [base, categoryName, edition.id, edition.phase],
  );

  const setStatus = (rows: readonly AwardRow[], status: 'active' | 'hidden') =>
    startTransition(async () => {
      const res = await setAwardsStatus(
        rows.map((r) => r.id),
        status,
      );
      if (res.ok) {
        toast.success(status === 'hidden' ? 'Hidden from the public.' : 'Visible to the public.');
        gridApi?.deselectAll();
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });

  const massActions = useMemo<MassActions<AwardRow>>(
    () => ({
      itemName: 'award',
      onDelete: (selected) => setConfirm(selected),
      custom: [
        {
          label: 'Hide from the public',
          icon: <EyeOff className="h-4 w-4" />,
          onClick: (selected: AwardRow[]) => setStatus(selected, 'hidden'),
        },
        {
          label: 'Show to the public',
          icon: <Eye className="h-4 w-4" />,
          onClick: (selected: AwardRow[]) => setStatus(selected, 'active'),
        },
      ],
    }),
    [gridApi],
  );

  const onRowClicked = (e: RowClickedEvent<AwardRow>) => {
    if (!e.data) return;
    router.push(`${base}/awards/${e.data.id}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'award' : 'awards'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate
        createLabel="Add award"
        onCreate={() => setEditing({ id: null, input: blank })}
        filters={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setManagingCategories((v) => !v)}
          >
            <FolderTree className="h-3.5 w-3.5" />
            Categories
            <span className="ml-1 text-xs text-muted-foreground">({categories.length})</span>
          </Button>
        }
      />

      {/* Categories live beside the awards they group. They exist for no
          other purpose, and sending someone to another screen to make one
          before they can finish adding an award is the trip this avoids. */}
      {managingCategories && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">Categories</p>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            Headings that group the awards below. An award can also stand alone — Branch and Country
            Chapter have no parent heading.
          </p>
          <CategoryManager editionId={edition.id} categories={categories} awards={awards} />
        </div>
      )}

      {emptyAwards > 0 && (edition.phase === 'voting' || edition.phase === 'review') && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          <strong className="text-foreground">
            {emptyAwards} {emptyAwards === 1 ? 'award has' : 'awards have'} nobody on the ballot.
          </strong>{' '}
          Voters are not shown an award with no candidates at all.
        </p>
      )}

      <DataTable<AwardRow>
        rowData={filtered as AwardRow[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={onRowClicked}
        rowHeight={CLAMPED_ROW_HEIGHT}
        showColumnPicker={false}
        selectionPinned={false}
        massActions={massActions}
      />

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
                      // A placeholder space keeps the select on "New
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
                            router.refresh();
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
        open={confirm !== null}
        title={`Delete ${confirm?.length ?? 0} award${confirm?.length === 1 ? '' : 's'}?`}
        description="Any award that already has nominations against it is kept — deleting would take the citations people wrote with it. Hide those instead."
        confirmLabel="Delete"
        onConfirm={() => {
          const targets = confirm;
          setConfirm(null);
          if (!targets) return;
          startTransition(async () => {
            const res = await deleteAwards(targets.map((t) => t.id));
            if (!res.ok) {
              toast.error(res.message);
              return;
            }
            toast.success(
              res.kept
                ? `Deleted ${targets.length - res.kept}. Kept ${res.kept} that hold nominations.`
                : `Deleted ${targets.length}.`,
            );
            gridApi?.deselectAll();
            router.refresh();
          });
        }}
        onCancel={() => setConfirm(null)}
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

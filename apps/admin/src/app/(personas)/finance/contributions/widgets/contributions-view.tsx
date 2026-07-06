'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, CalendarPlus, CircleCheck, Plus, Square, Target } from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EntityTablePanel,
  Input,
  Label,
  NativeDateInput,
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
} from '@shesa/ui';

import {
  approveContribution,
  archiveContribution,
  closeContribution,
  createContribution,
  extendContribution,
} from '../actions';

export interface ContributionRow {
  readonly id: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly currency: string;
  readonly baseAmount: number | null;
  readonly goalAmount: number | null;
  readonly minAmount: number | null;
  readonly capacity: number | null;
  readonly lifecycle: string | null;
  readonly openDate: string | null;
  readonly closeDate: string | null;
  readonly status: string;
  readonly raised: number;
  readonly contributorCount: number;
}

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly currency: string;
}

type SerialRow = ContributionRow & { readonly serial: number };
type ContributionShape = 'goal' | 'open' | 'ticketed' | 'fixed';

const SHAPES: readonly { value: ContributionShape; label: string; help: string }[] = [
  { value: 'goal', label: 'Goal', help: 'Rally toward a group total. No per-member arrears.' },
  { value: 'open', label: 'Open', help: 'Any amount, no goal ceiling. Optional minimum.' },
  { value: 'ticketed', label: 'Ticketed', help: 'Fixed unit price with an optional capacity.' },
  {
    value: 'fixed',
    label: 'Fixed',
    help: 'Per-member fixed amount. Behaves like a one-off charge.',
  },
];

interface CreateForm {
  scopeId: string;
  shape: ContributionShape;
  name: string;
  description: string;
  amount: string;
  capacity: string;
  openDate: string;
  closeDate: string;
}

const initialCreate = (scopeOptions: readonly ScopeOption[]): CreateForm => ({
  scopeId: scopeOptions[0]?.id ?? '',
  shape: 'goal',
  name: '',
  description: '',
  amount: '',
  capacity: '',
  openDate: new Date().toISOString().slice(0, 10),
  closeDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
});

interface ContributionsViewProps {
  readonly contributions: readonly ContributionRow[];
  readonly scopeOptions: readonly ScopeOption[];
}

export function ContributionsView({ contributions, scopeOptions }: ContributionsViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<
    'all' | 'draft' | 'open' | 'closed' | 'archived'
  >('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(() => initialCreate(scopeOptions));
  const [extendTarget, setExtendTarget] = useState<ContributionRow | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const canCreate = scopeOptions.length > 0;

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return contributions
      .filter((c) => {
        if (lifecycleFilter !== 'all' && c.lifecycle !== lifecycleFilter) return false;
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.scopeName.toLowerCase().includes(q)) return true;
        if (c.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((c, i) => ({ ...c, serial: i + 1 }));
  }, [contributions, search, lifecycleFilter]);

  const resetCreate = () => setCreateForm(initialCreate(scopeOptions));

  const runCreate = () => {
    if (!createForm.scopeId) {
      toast.error('Pick a scope.');
      return;
    }
    if (!createForm.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    const scope = scopeOptions.find((s) => s.id === createForm.scopeId);
    if (!scope) {
      toast.error('Invalid scope.');
      return;
    }
    const openDate = new Date(createForm.openDate);
    const closeDate = new Date(createForm.closeDate);
    if (closeDate.getTime() <= openDate.getTime()) {
      toast.error('Close date must be after open date.');
      return;
    }

    const amount = createForm.amount ? parseFloat(createForm.amount) : undefined;
    const capacity = createForm.capacity ? parseInt(createForm.capacity, 10) : undefined;

    if (createForm.shape === 'goal' && (!amount || amount <= 0)) {
      toast.error('Goal amount is required.');
      return;
    }
    if (createForm.shape === 'fixed' && (!amount || amount <= 0)) {
      toast.error('Base amount is required for fixed shape.');
      return;
    }
    if (createForm.shape === 'ticketed' && (!amount || amount <= 0)) {
      toast.error('Unit price (base amount) is required for ticketed shape.');
      return;
    }

    startTransition(async () => {
      const result = await createContribution({
        scopeId: createForm.scopeId,
        shape: createForm.shape,
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        currency: scope.currency,
        openDate: openDate.toISOString(),
        closeDate: closeDate.toISOString(),
        goalAmount: createForm.shape === 'goal' ? amount : undefined,
        minAmount: createForm.shape === 'open' && amount ? amount : undefined,
        baseAmount:
          createForm.shape === 'fixed' || createForm.shape === 'ticketed' ? amount : undefined,
        capacity: createForm.shape === 'ticketed' ? capacity : undefined,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution created as draft.');
      setCreateOpen(false);
      resetCreate();
      router.refresh();
    });
  };

  const runApprove = (id: string) => {
    startTransition(async () => {
      const result = await approveContribution(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution approved and open.');
      router.refresh();
    });
  };

  const runClose = () => {
    if (!closingId) return;
    const id = closingId;
    setClosingId(null);
    startTransition(async () => {
      const result = await closeContribution(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution closed.');
      router.refresh();
    });
  };

  const runExtend = () => {
    if (!extendTarget) return;
    if (!extendDate) {
      toast.error('Pick a new close date.');
      return;
    }
    const newClose = new Date(extendDate);
    if (
      extendTarget.closeDate &&
      newClose.getTime() <= new Date(extendTarget.closeDate).getTime()
    ) {
      toast.error('New close date must be after the current one.');
      return;
    }
    const id = extendTarget.id;
    const iso = newClose.toISOString();
    const reason = extendReason.trim() || undefined;
    setExtendTarget(null);
    setExtendDate('');
    setExtendReason('');
    startTransition(async () => {
      const result = await extendContribution(id, iso, reason);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution extended.');
      router.refresh();
    });
  };

  const runArchive = () => {
    if (!archivingId) return;
    const id = archivingId;
    setArchivingId(null);
    startTransition(async () => {
      const result = await archiveContribution(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Contribution archived.');
      router.refresh();
    });
  };

  const columnDefs = useMemo<ColDef<SerialRow>[]>(
    () => [
      {
        headerName: 'S/N',
        field: 'serial',
        width: 72,
        maxWidth: 72,
        sortable: false,
        filter: false,
        suppressMovable: true,
      },
      {
        headerName: 'Name',
        field: 'name',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
          p.data ? (
            <div className="flex flex-col leading-tight">
              <span className="font-medium text-foreground">{p.data.name}</span>
              <span className="text-xs text-muted-foreground">
                {p.data.scopeName} · {p.data.shape}
              </span>
            </div>
          ) : null,
      },
      {
        headerName: 'Progress',
        field: 'raised',
        flex: 1.5,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<SerialRow, number>) => {
          if (!p.data) return null;
          const row = p.data;
          const goal = row.goalAmount;
          const raised = row.raised;
          const pct = goal && goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : null;
          return (
            <div className="flex w-full flex-col gap-1 py-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-foreground">
                  {new Intl.NumberFormat().format(Math.round(raised))} {row.currency}
                </span>
                {goal ? (
                  <span className="text-muted-foreground">
                    of {new Intl.NumberFormat().format(goal)} {pct != null && `· ${pct}%`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {row.contributorCount} contributor{row.contributorCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {goal && (
                <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full rounded bg-primary" style={{ width: `${pct ?? 0}%` }} />
                </div>
              )}
            </div>
          );
        },
      },
      {
        headerName: 'Contributors',
        field: 'contributorCount',
        width: 130,
        valueFormatter: (p) => (p.value != null ? String(p.value) : '0'),
      },
      {
        headerName: 'Closes',
        field: 'closeDate',
        width: 140,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
      {
        headerName: 'Lifecycle',
        field: 'lifecycle',
        width: 130,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <LifecycleBadge value={p.value ?? null} />
        ),
      },
      {
        headerName: 'Actions',
        colId: 'row_actions',
        width: 250,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const row = p.data;
          return (
            <div className="flex items-center gap-1">
              {row.lifecycle === 'draft' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    runApprove(row.id);
                  }}
                  disabled={pending}
                  title="Approve → open"
                >
                  <CircleCheck className="h-3.5 w-3.5" />
                </Button>
              )}
              {row.lifecycle === 'open' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setClosingId(row.id);
                  }}
                  disabled={pending}
                  title="Close now"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              )}
              {(row.lifecycle === 'open' || row.lifecycle === 'closed') && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExtendTarget(row);
                    setExtendDate(
                      row.closeDate
                        ? new Date(new Date(row.closeDate).getTime() + 7 * 24 * 3600 * 1000)
                            .toISOString()
                            .slice(0, 10)
                        : '',
                    );
                    setExtendReason('');
                  }}
                  disabled={pending}
                  title="Extend"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                </Button>
              )}
              {row.lifecycle !== 'archived' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setArchivingId(row.id);
                  }}
                  disabled={pending}
                  title="Archive"
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [pending],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Target className="h-6 w-6" />
          Contributions
        </h1>
        <p className="text-sm text-muted-foreground">
          Goal, open, ticketed, and fixed contributions. Approve to open; close early to stop;
          extend to give more time.
        </p>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'contribution' : 'contributions'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        createLabel="New contribution"
        onCreate={() => {
          resetCreate();
          setCreateOpen(true);
        }}
        filters={
          <Select
            value={lifecycleFilter}
            onValueChange={(v) => setLifecycleFilter(v as typeof lifecycleFilter)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lifecycles</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New contribution</DialogTitle>
            <DialogDescription>
              Enters as draft. Approve to open the window and start accepting payments.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="shape">Shape</Label>
              <Select
                value={createForm.shape}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, shape: v as ContributionShape }))
                }
              >
                <SelectTrigger id="shape">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHAPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {SHAPES.find((s) => s.value === createForm.shape)?.help}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scope">Scope</Label>
              <Select
                value={createForm.scopeId}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, scopeId: v }))}
              >
                <SelectTrigger id="scope">
                  <SelectValue placeholder="Pick a scope" />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. AGM Project Fund 2027"
                maxLength={200}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                rows={2}
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={2000}
              />
            </div>
            {(createForm.shape === 'goal' ||
              createForm.shape === 'fixed' ||
              createForm.shape === 'ticketed' ||
              createForm.shape === 'open') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="amount">
                    {createForm.shape === 'goal'
                      ? 'Goal amount'
                      : createForm.shape === 'ticketed'
                        ? 'Unit price'
                        : createForm.shape === 'fixed'
                          ? 'Base amount'
                          : 'Minimum amount (optional)'}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="1"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                {createForm.shape === 'ticketed' && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="capacity">Capacity (optional)</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      step="1"
                      value={createForm.capacity}
                      onChange={(e) => setCreateForm((f) => ({ ...f, capacity: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="open-date">Open date</Label>
                <NativeDateInput
                  id="open-date"
                  value={createForm.openDate}
                  onChange={(v) => setCreateForm((f) => ({ ...f, openDate: v }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="close-date">Close date</Label>
                <NativeDateInput
                  id="close-date"
                  value={createForm.closeDate}
                  onChange={(v) => setCreateForm((f) => ({ ...f, closeDate: v }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={runCreate} disabled={pending}>
              <Plus className="h-4 w-4" />
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend dialog */}
      <Dialog open={!!extendTarget} onOpenChange={(o) => !o && setExtendTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Extend contribution</DialogTitle>
            <DialogDescription>
              Sets a new close date past the current one. Every extension is audited into
              finance.contribution_extensions with the who / when / why.
            </DialogDescription>
          </DialogHeader>
          {extendTarget && (
            <div className="flex flex-col gap-3">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
                <div className="text-foreground">{extendTarget.name}</div>
                <div className="text-muted-foreground">
                  Current close:{' '}
                  {extendTarget.closeDate ? new Date(extendTarget.closeDate).toLocaleString() : '—'}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="extend-date">New close date</Label>
                <NativeDateInput
                  id="extend-date"
                  value={extendDate}
                  onChange={(v) => setExtendDate(v)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="extend-reason">Reason (optional)</Label>
                <Textarea
                  id="extend-reason"
                  rows={2}
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExtendTarget(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={runExtend} disabled={pending}>
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!closingId}
        title="Close this contribution?"
        description="Stops accepting payments immediately. Reversible via Extend if you change your mind before archive."
        confirmLabel="Close"
        onConfirm={runClose}
        onCancel={() => setClosingId(null)}
      />

      <ConfirmDialog
        open={!!archivingId}
        title="Archive this contribution?"
        description="Recorded payments stay in the ledger. Archive just hides the campaign from live lists."
        confirmLabel="Archive"
        onConfirm={runArchive}
        onCancel={() => setArchivingId(null)}
      />
    </div>
  );
}

function LifecycleBadge({ value }: { readonly value: string | null }) {
  const styles: Record<string, string> = {
    draft: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    open: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    closed: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    archived: 'border-destructive/40 bg-destructive/10 text-destructive',
  };
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';
  return (
    <Badge variant="outline" className={value ? styles[value] : 'border-border text-foreground'}>
      {label}
    </Badge>
  );
}

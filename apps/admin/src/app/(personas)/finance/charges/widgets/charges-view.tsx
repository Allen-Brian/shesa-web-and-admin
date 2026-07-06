'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, BadgeDollarSign, Pencil, Play, RefreshCw } from 'lucide-react';

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

import { archiveCharge, createCharge, generateObligations, updateCharge } from '../actions';

export interface ChargeRow {
  readonly id: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly scopeSlug: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly baseAmount: number | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrenceInterval: number;
  readonly status: string;
  readonly activationDate: string | null;
  readonly createdAt: string;
}

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly currency: string;
  readonly scopeType: string;
}

type SerialRow = ChargeRow & { readonly serial: number };

interface ChargesViewProps {
  readonly charges: readonly ChargeRow[];
  readonly scopeOptions: readonly ScopeOption[];
}

const RECURRENCES = [
  { value: 'one_time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Bi-annual' },
  { value: 'yearly', label: 'Yearly' },
] as const;

type Recurrence = (typeof RECURRENCES)[number]['value'];

interface CreateForm {
  scopeId: string;
  name: string;
  description: string;
  baseAmount: string;
  recurrence: Recurrence;
  activationDate: string;
}

interface EditForm {
  id: string;
  name: string;
  description: string;
  activationDate: string;
  status: 'draft' | 'active' | 'paused';
}

const initialCreate = (scopeOptions: readonly ScopeOption[]): CreateForm => ({
  scopeId: scopeOptions[0]?.id ?? '',
  name: '',
  description: '',
  baseAmount: '',
  recurrence: 'monthly',
  activationDate: new Date().toISOString().slice(0, 10),
});

export function ChargesView({ charges, scopeOptions }: ChargesViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<'all' | ChargeRow['status']>('all');
  const [search, setSearch] = useState('');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(() => initialCreate(scopeOptions));
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const canCreate = scopeOptions.length > 0;

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return charges
      .filter((c) => {
        if (statusFilter !== 'all' && c.status !== statusFilter) return false;
        if (!q) return true;
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.scopeName.toLowerCase().includes(q)) return true;
        if (c.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((c, i) => ({ ...c, serial: i + 1 }));
  }, [charges, search, statusFilter]);

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
    const amount = parseFloat(createForm.baseAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a positive base amount.');
      return;
    }
    const scope = scopeOptions.find((s) => s.id === createForm.scopeId);
    if (!scope) {
      toast.error('Invalid scope.');
      return;
    }
    startTransition(async () => {
      const result = await createCharge({
        scopeId: createForm.scopeId,
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        baseAmount: amount,
        currency: scope.currency,
        recurrence: createForm.recurrence,
        recurrenceInterval: 1,
        activationDate: new Date(createForm.activationDate).toISOString(),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge created as draft.');
      setCreateOpen(false);
      resetCreate();
      router.refresh();
    });
  };

  const runEdit = () => {
    if (!editing) return;
    startTransition(async () => {
      const result = await updateCharge({
        id: editing.id,
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        activationDate: new Date(editing.activationDate).toISOString(),
        status: editing.status,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge updated.');
      setEditing(null);
      router.refresh();
    });
  };

  const runArchive = () => {
    if (!archivingId) return;
    const id = archivingId;
    setArchivingId(null);
    startTransition(async () => {
      const result = await archiveCharge(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge archived.');
      router.refresh();
    });
  };

  const runActivate = (chargeId: string) => {
    startTransition(async () => {
      const result = await updateCharge({ id: chargeId, status: 'active' });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Charge activated.');
      router.refresh();
    });
  };

  const runGenerate = (chargeId: string) => {
    startTransition(async () => {
      const result = await generateObligations(chargeId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const inserted = result.data?.inserted ?? 0;
      toast.success(
        inserted > 0
          ? `Generated ${inserted} obligation${inserted === 1 ? '' : 's'}.`
          : 'No new obligations — the current period is already covered.',
      );
      router.refresh();
    });
  };

  const beginEdit = (row: ChargeRow) => {
    setEditing({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      activationDate: row.activationDate
        ? row.activationDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      status:
        row.status === 'draft' || row.status === 'active' || row.status === 'paused'
          ? row.status
          : 'draft',
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
              {p.data.description && (
                <span className="truncate text-xs italic text-muted-foreground">
                  {p.data.description}
                </span>
              )}
            </div>
          ) : null,
      },
      { headerName: 'Scope', field: 'scopeName', flex: 1, minWidth: 140 },
      {
        headerName: 'Amount',
        field: 'baseAmount',
        width: 150,
        cellRenderer: (p: ICellRendererParams<SerialRow, number>) =>
          p.data && p.data.baseAmount != null ? (
            <span className="font-mono text-sm text-foreground">
              {new Intl.NumberFormat().format(p.data.baseAmount)} {p.data.currency}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        headerName: 'Recurrence',
        field: 'recurrence',
        width: 140,
        valueFormatter: (p) =>
          p.data ? formatRecurrence(p.data.recurrence, p.data.recurrenceInterval) : '',
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <StatusBadge status={p.value ?? ''} />
        ),
      },
      {
        headerName: 'Activates',
        field: 'activationDate',
        width: 130,
        valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
      },
      {
        headerName: 'Actions',
        colId: 'row_actions',
        width: 200,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SerialRow>) => {
          if (!p.data) return null;
          const row = p.data;
          return (
            <div className="flex items-center gap-1">
              {row.status !== 'archived' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    beginEdit(row);
                  }}
                  disabled={pending}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {row.status === 'draft' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    runActivate(row.id);
                  }}
                  disabled={pending}
                  title="Activate"
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
              {row.status === 'active' && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    runGenerate(row.id);
                  }}
                  disabled={pending}
                  title="Generate obligations now"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
              {row.status !== 'archived' && (
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
          <BadgeDollarSign className="h-6 w-6" />
          Charges
        </h1>
        <p className="text-sm text-muted-foreground">
          Dues + levies at scopes you can see. Each active charge generates its next period&apos;s
          obligations automatically on the hourly sweep.
        </p>
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'charge' : 'charges'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={canCreate}
        createLabel="New charge"
        onCreate={() => {
          resetCreate();
          setCreateOpen(true);
        }}
        filters={
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
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
            <DialogTitle>New charge</DialogTitle>
            <DialogDescription>
              A charge creates per-member obligations on its schedule. It starts as a draft;
              activate it when you&apos;re ready for the hourly sweep to fire.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
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
                placeholder="e.g. Monthly Dues"
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
                placeholder="What this charge is for."
                maxLength={2000}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount">Base amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="1"
                  value={createForm.baseAmount}
                  onChange={(e) => setCreateForm((f) => ({ ...f, baseAmount: e.target.value }))}
                  placeholder="25000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="recurrence">Recurrence</Label>
                <Select
                  value={createForm.recurrence}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({ ...f, recurrence: v as Recurrence }))
                  }
                >
                  <SelectTrigger id="recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRENCES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="activation">Activation date</Label>
              <NativeDateInput
                id="activation"
                value={createForm.activationDate}
                onChange={(v) => setCreateForm((f) => ({ ...f, activationDate: v }))}
              />
              <span className="text-xs text-muted-foreground">
                The instant arrears begin. Obligations for the current period generate from here.
              </span>
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
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit charge</DialogTitle>
            <DialogDescription>
              Only editable metadata + status transitions. Amount, currency, and recurrence are
              frozen once the charge exists so any obligations already generated stay explainable.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editing.name}
                  onChange={(e) => setEditing((v) => (v ? { ...v, name: e.target.value } : v))}
                  maxLength={200}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  rows={2}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing((v) => (v ? { ...v, description: e.target.value } : v))
                  }
                  maxLength={2000}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-activation">Activation date</Label>
                <NativeDateInput
                  id="edit-activation"
                  value={editing.activationDate}
                  onChange={(v) =>
                    setEditing((prev) => (prev ? { ...prev, activationDate: v } : prev))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editing.status}
                  onValueChange={(v) =>
                    setEditing((prev) =>
                      prev ? { ...prev, status: v as EditForm['status'] } : prev,
                    )
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={runEdit} disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!archivingId}
        title="Archive this charge?"
        description="Related obligations stay put — archive just stops new obligation generation."
        confirmLabel="Archive"
        onConfirm={runArchive}
        onCancel={() => setArchivingId(null)}
      />
    </div>
  );
}

function StatusBadge({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    draft: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    paused: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    archived: 'border-destructive/40 bg-destructive/10 text-destructive',
  };
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border text-foreground'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function formatRecurrence(recurrence: string, interval: number): string {
  if (recurrence === 'one_time') return 'One-time';
  const label =
    recurrence === 'biannual'
      ? 'bi-annually'
      : recurrence === 'quarterly'
        ? 'quarterly'
        : recurrence === 'yearly'
          ? 'yearly'
          : recurrence === 'monthly'
            ? 'monthly'
            : recurrence;
  return interval > 1 ? `every ${interval} × ${label}` : label;
}

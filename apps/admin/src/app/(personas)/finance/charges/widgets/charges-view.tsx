'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, BadgeDollarSign, Play, Plus, RefreshCw } from 'lucide-react';

import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(() => initialCreate(scopeOptions));
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const canCreate = scopeOptions.length > 0;

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return charges;
    return charges.filter((c) => c.status === statusFilter);
  }, [charges, statusFilter]);

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

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
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
      </header>

      <div className="flex flex-wrap items-center gap-2">
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
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {charges.length}
        </span>
        <div className="ml-auto">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              resetCreate();
              setCreateOpen(true);
            }}
            disabled={!canCreate || pending}
          >
            <Plus className="h-4 w-4" />
            New charge
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {charges.length === 0
            ? canCreate
              ? 'No charges yet. Create your first one.'
              : 'No charges yet, and no finance-bearing scopes are visible to you.'
            : 'No charges match the current filter.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-foreground">{c.name}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {c.scopeName} · {c.shape} ·{' '}
                    {formatRecurrence(c.recurrence, c.recurrenceInterval)}
                    {c.activationDate &&
                      ` · activates ${new Date(c.activationDate).toLocaleDateString()}`}
                  </span>
                  {c.description && (
                    <span className="text-xs text-muted-foreground italic">{c.description}</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg text-foreground">
                    {c.baseAmount != null
                      ? `${new Intl.NumberFormat().format(c.baseAmount)} ${c.currency}`
                      : '—'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {c.status !== 'archived' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditing({
                        id: c.id,
                        name: c.name,
                        description: c.description ?? '',
                        activationDate: c.activationDate
                          ? c.activationDate.slice(0, 10)
                          : new Date().toISOString().slice(0, 10),
                        status:
                          c.status === 'draft' || c.status === 'active' || c.status === 'paused'
                            ? c.status
                            : 'draft',
                      })
                    }
                    disabled={pending}
                  >
                    Edit
                  </Button>
                )}
                {c.status === 'active' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => runGenerate(c.id)}
                    disabled={pending}
                    title="Fire obligation generation now (also runs hourly via pg_cron)"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Generate now
                  </Button>
                )}
                {c.status === 'draft' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await updateCharge({ id: c.id, status: 'active' });
                        if (!result.ok) {
                          toast.error(result.message);
                          return;
                        }
                        toast.success('Charge activated.');
                        router.refresh();
                      })
                    }
                    disabled={pending}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Activate
                  </Button>
                )}
                {c.status !== 'archived' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setArchivingId(c.id)}
                    disabled={pending}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

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
        description="Related obligations stay put — archive just stops new obligation generation. Reversible via the DB if needed."
        confirmLabel="Archive"
        onConfirm={runArchive}
        onCancel={() => setArchivingId(null)}
      />
    </section>
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

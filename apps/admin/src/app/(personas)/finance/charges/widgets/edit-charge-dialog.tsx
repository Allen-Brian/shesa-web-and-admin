'use client';

import { useMemo } from 'react';
import { Building2, Lock, Pencil, Send, User } from 'lucide-react';

import {
  Badge,
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
} from '@shesa/ui';

import { ChargeTargetAmountsTable } from './charge-target-amounts-table';
import { ChargeTargetPicker } from './charge-target-picker';
import type { ChargeTargetDraft, EditForm, Recurrence, TargetScopeOption } from './charges-types';
import { RECURRENCES } from './charges-types';

interface EditChargeDialogProps {
  readonly editing: EditForm | null;
  readonly targetScopeOptions: readonly TargetScopeOption[];
  readonly onClose: () => void;
  readonly onChange: (patch: Partial<EditForm>) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * Edit dialog for an existing charge. Same visual shape as the Create
 * wizard's Basics step so operators don't relearn the form: two-column
 * grid for the metadata + amount/recurrence/activation, description
 * spanning the full row, plus a Status select and (for drafts) the
 * targets picker + per-target amounts table.
 *
 * Type is displayed but locked — flipping the shape mid-life would
 * break every obligation already generated. Base amount, recurrence,
 * and target amounts are draft-only; the edge fn rejects any change
 * to them once the charge has been activated.
 */
export function EditChargeDialog({
  editing,
  targetScopeOptions,
  onClose,
  onChange,
  onSubmit,
  pending,
}: EditChargeDialogProps) {
  const isDraft = editing?.status === 'draft';
  const isGroup = editing?.targetPartyType === 'branch';
  const isOneTime = editing?.recurrence === 'one_time';
  // Amounts are editable on a draft, or on any live RECURRING charge
  // (the change is scheduled for next period). A one-time charge has no
  // next period, so its amount stays frozen once activated. Recurrence
  // and the target SET (add/remove) are always draft-only.
  const amountEditable = !!isDraft || !isOneTime;
  const structureLock = !isDraft;

  const targetLookup = useMemo(
    () => new Map(targetScopeOptions.map((t) => [t.id, t])),
    [targetScopeOptions],
  );
  const selectedIds = useMemo(
    () => (editing?.chargeTargets ?? []).map((t) => t.targetScopeId),
    [editing?.chargeTargets],
  );

  if (!editing) return null;

  const toggleTarget = (id: string, next: boolean) => {
    if (structureLock) return;
    if (next) {
      if (editing.chargeTargets.some((t) => t.targetScopeId === id)) return;
      const nextTargets: ChargeTargetDraft[] = [
        ...editing.chargeTargets,
        { targetScopeId: id, amount: editing.baseAmount || '' },
      ];
      onChange({ chargeTargets: nextTargets });
      return;
    }
    onChange({
      chargeTargets: editing.chargeTargets.filter((t) => t.targetScopeId !== id),
    });
  };

  const setTargetAmount = (id: string, amount: string) => {
    if (!amountEditable) return;
    onChange({
      chargeTargets: editing.chargeTargets.map((t) =>
        t.targetScopeId === id ? { ...t, amount } : t,
      ),
    });
  };

  const applyDefault = () => {
    if (!editing.baseAmount) return;
    onChange({
      chargeTargets: editing.chargeTargets.map((t) => ({ ...t, amount: editing.baseAmount })),
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto p-0 sm:max-w-3xl">
        <div className="flex flex-col gap-4 p-6 sm:p-8">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Pencil className="h-5 w-5 text-muted-foreground" />
              Edit charge
            </DialogTitle>
            <DialogDescription>
              {isDraft
                ? 'Everything is editable while the charge is a draft. Once you publish, cadence and the target list freeze.'
                : isOneTime
                  ? 'Metadata + status are editable. A one-time charge freezes its amount once activated — archive and recreate to change it.'
                  : 'Metadata + status are editable. Amount changes are scheduled for the next period; the current and past periods stay as billed.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              {isGroup ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              Type
            </span>
            <span className="font-medium text-foreground">
              {isGroup ? 'Group (per-target)' : 'Individual (per-member)'}
            </span>
            <Badge variant="outline" className="ml-2 gap-1">
              <Lock className="h-3 w-3" /> locked
            </Badge>
            <span className="ml-auto text-muted-foreground">
              Currency <span className="font-medium text-foreground">{editing.currency}</span>
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editing.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={200}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-amount">
                {isGroup ? 'Default amount' : 'Base amount'}
                {!amountEditable && <LockedHint />}
                {amountEditable && !isDraft && <ScheduledHint />}
              </Label>
              <Input
                id="edit-amount"
                type="number"
                min="0"
                step="1"
                value={editing.baseAmount}
                onChange={(e) => onChange({ baseAmount: e.target.value })}
                disabled={!amountEditable}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-recurrence">
                Recurrence
                {!isDraft && <LockedHint />}
              </Label>
              <Select
                value={editing.recurrence}
                onValueChange={(v) => onChange({ recurrence: v as Recurrence })}
                disabled={!isDraft}
              >
                <SelectTrigger id="edit-recurrence">
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

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-activation">Activation date</Label>
              <DatePicker
                id="edit-activation"
                value={editing.activationDate}
                onChange={(v) => onChange({ activationDate: v })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Textarea
              id="edit-description"
              rows={3}
              value={editing.description}
              onChange={(e) => onChange({ description: e.target.value })}
              maxLength={2000}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={editing.status}
              onValueChange={(v) => onChange({ status: v as EditForm['status'] })}
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
            {isDraft && (
              <span className="text-xs text-muted-foreground">
                Flip to Active to publish — obligations generate automatically.
              </span>
            )}
          </div>

          {isGroup && (
            <div className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Targets & amounts</span>
                {structureLock && (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="h-3 w-3" />
                    {amountEditable ? 'target list locked' : 'locked'}
                  </Badge>
                )}
              </div>
              {structureLock && amountEditable && (
                <p className="text-xs text-muted-foreground">
                  The target list is fixed once activated, but you can still adjust amounts — each
                  change takes effect next period.
                </p>
              )}
              {isDraft ? (
                <ChargeTargetPicker
                  targetScopeOptions={targetScopeOptions}
                  selectedIds={selectedIds}
                  onToggle={toggleTarget}
                  onClearAll={() => onChange({ chargeTargets: [] })}
                />
              ) : null}
              <ChargeTargetAmountsTable
                targets={editing.chargeTargets}
                targetLookup={targetLookup}
                defaultAmount={editing.baseAmount}
                currency={editing.currency}
                onAmountChange={setTargetAmount}
                onRemove={(id) => toggleTarget(id, false)}
                onApplyDefaultToAll={applyDefault}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t px-6 py-4 sm:px-8 sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {isDraft
              ? 'Draft — nothing has been billed yet.'
              : isOneTime
                ? 'Live one-time charge — amount is frozen.'
                : 'Live — amount changes are scheduled for next period.'}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              loading={pending}
              disabled={pending}
            >
              Cancel
            </Button>
            {isDraft ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onChange({ status: 'active' });
                  onSubmit();
                }}
                loading={pending}
                disabled={pending}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Publish
              </Button>
            ) : null}
            <Button type="button" size="sm" onClick={onSubmit} loading={pending} disabled={pending}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LockedHint() {
  return <span className="ml-1 text-[10px] font-normal text-muted-foreground">· frozen</span>;
}

function ScheduledHint() {
  return (
    <span className="ml-1 text-[10px] font-normal text-primary">· takes effect next period</span>
  );
}

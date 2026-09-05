'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Search } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@shesa/ui';

import { createRule } from '../charge-detail-actions';
import type { ChargeRulesData, RuleForm } from './charge-detail-types';

/**
 * Add-rule dialog for an individual charge. Maps the operator's plain
 * intent — a batch tier, a recent-leaver exemption, a senior discount,
 * or a single-member override — onto a finance.exceptions row. The rule
 * takes effect from the next period (generation reads it then).
 */
export function ChargeRuleDialog({
  open,
  onClose,
  chargeId,
  data,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly chargeId: string;
  readonly data: ChargeRulesData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<RuleForm>('fixed');
  const [amount, setAmount] = useState('');
  const [batchIds, setBatchIds] = useState<readonly string[]>([]);
  const [years, setYears] = useState('');
  const [memberId, setMemberId] = useState('');
  const [q, setQ] = useState('');

  const filteredBatches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle
      ? data.batchOptions.filter((b) => b.name.toLowerCase().includes(needle))
      : data.batchOptions;
  }, [data.batchOptions, q]);

  const reset = () => {
    setForm('fixed');
    setAmount('');
    setBatchIds([]);
    setYears('');
    setMemberId('');
    setQ('');
  };

  const submit = () => {
    const replacementAmount = parseFloat(amount);
    if (!Number.isFinite(replacementAmount) || replacementAmount < 0)
      return toast.error('Enter a valid amount (0 or more).');
    if (form === 'fixed' && batchIds.length === 0) return toast.error('Pick at least one batch.');
    const yr = parseInt(years, 10);
    if ((form === 'relative' || form === 'senior') && (!Number.isInteger(yr) || yr < 0))
      return toast.error('Enter a whole number of years.');
    if (form === 'individual' && !memberId) return toast.error('Pick a member.');

    startTransition(async () => {
      const res = await createRule({
        chargeId,
        form,
        replacementAmount,
        batchScopeIds: form === 'fixed' ? batchIds : undefined,
        maxYearsSinceExit: form === 'relative' ? yr : undefined,
        minYearsSinceExit: form === 'senior' ? yr : undefined,
        memberId: form === 'individual' ? memberId : undefined,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Rule added — takes effect next period.');
      reset();
      router.refresh();
      onClose();
    });
  };

  const toggleBatch = (id: string) =>
    setBatchIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a member rule</DialogTitle>
          <DialogDescription>
            Different members can pay different amounts. Highest-priority rule wins — no stacking.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Rule type</Label>
            <Select value={form} onValueChange={(v) => setForm(v as RuleForm)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">
                  Batch tier — specific batches pay a set amount
                </SelectItem>
                <SelectItem value="relative">
                  Recent leavers — exited within the last N years
                </SelectItem>
                <SelectItem value="senior">Seniors — exited more than N years ago</SelectItem>
                {data.canManageIndividual && (
                  <SelectItem value="individual">Individual override — one member</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {form === 'fixed' && (
            <div className="flex flex-col gap-2">
              <Label>Batches</Label>
              <div className="rounded-md border">
                <div className="flex items-center gap-2 border-b px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Filter batches"
                    className="h-6 flex-1 border-0 bg-transparent p-0 text-xs focus:outline-none focus:ring-0"
                  />
                </div>
                <ScrollArea className="max-h-80">
                  <ul className="py-1">
                    {filteredBatches.map((b) => {
                      const picked = batchIds.includes(b.id);
                      return (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => toggleBatch(b.id)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/60"
                          >
                            <span
                              className={
                                'flex h-4 w-4 items-center justify-center rounded border ' +
                                (picked
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40')
                              }
                            >
                              {picked && <Check className="h-3 w-3" />}
                            </span>
                            <span className="flex-1 truncate">{b.name}</span>
                          </button>
                        </li>
                      );
                    })}
                    {filteredBatches.length === 0 && (
                      <li className="px-3 py-3 text-center text-xs text-muted-foreground">
                        No batches.
                      </li>
                    )}
                  </ul>
                </ScrollArea>
              </div>
            </div>
          )}

          {(form === 'relative' || form === 'senior') && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="rule-years">
                {form === 'relative'
                  ? 'Exited within the last … years'
                  : 'Exited more than … years ago'}
              </Label>
              <Input
                id="rule-years"
                type="number"
                min="0"
                step="1"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="w-32"
              />
            </div>
          )}

          {form === 'individual' && (
            <div className="flex flex-col gap-2">
              <Label>Member</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a member" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {data.memberOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-amount">Amount they pay ({data.currency})</Label>
            <Input
              id="rule-amount"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0 = exempt"
              className="w-40"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={submit} loading={pending} disabled={pending}>
            Add rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { Building2, GraduationCap, Wand2, X } from 'lucide-react';

import { Button, Input } from '@shesa/ui';

import type { ChargeTargetDraft, TargetScopeOption } from './charges-types';

interface ChargeTargetAmountsTableProps {
  readonly targets: readonly ChargeTargetDraft[];
  readonly targetLookup: ReadonlyMap<string, TargetScopeOption>;
  readonly defaultAmount: string;
  readonly currency: string;
  readonly onAmountChange: (targetScopeId: string, amount: string) => void;
  readonly onRemove: (targetScopeId: string) => void;
  readonly onApplyDefaultToAll: () => void;
}

/**
 * Editable table of per-target amounts. Column layout mirrors the
 * detail-page target grid so the operator sees roughly what the
 * finished charge will look like. "Apply default" is a bulk helper
 * that copies the step-2 default into every row — the common case
 * for "same amount for every branch" charges.
 */
export function ChargeTargetAmountsTable({
  targets,
  targetLookup,
  defaultAmount,
  currency,
  onAmountChange,
  onRemove,
  onApplyDefaultToAll,
}: ChargeTargetAmountsTableProps) {
  if (targets.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {targets.length} target{targets.length === 1 ? '' : 's'} · amounts in {currency}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onApplyDefaultToAll}
          disabled={!defaultAmount || !Number.isFinite(parseFloat(defaultAmount))}
        >
          <Wand2 className="h-3 w-3" /> Apply default to all
        </Button>
      </div>

      <div className="max-h-72 overflow-y-auto rounded border">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-1.5 text-left">Target</th>
              <th className="px-3 py-1.5 text-left">Kind</th>
              <th className="w-32 px-3 py-1.5 text-right">Amount</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {targets.map((t) => {
              const scope = targetLookup.get(t.targetScopeId);
              const Icon = scope?.scopeType === 'batch' ? GraduationCap : Building2;
              return (
                <tr key={t.targetScopeId}>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      <span className="truncate font-medium">
                        {scope?.name ?? '(unknown scope)'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{scope?.scopeType ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={t.amount}
                      onChange={(e) => onAmountChange(t.targetScopeId, e.target.value)}
                      className="h-7 text-right text-xs tabular-nums"
                      placeholder={defaultAmount || '0'}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(t.targetScopeId)}
                      aria-label={`Remove ${scope?.name ?? 'target'}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

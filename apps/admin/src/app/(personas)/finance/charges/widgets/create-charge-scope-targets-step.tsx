'use client';

import { useMemo, useState } from 'react';
import { Check, ListChecks, Search, X } from 'lucide-react';

import { Button, Input, ScrollArea } from '@shesa/ui';

import { ChargeTargetAmountsTable } from './charge-target-amounts-table';
import type {
  ChargeTargetDraft,
  CreateForm,
  TargetScopeOption,
  TargetScopeType,
} from './charges-types';

interface CreateChargeScopeTargetsStepProps {
  readonly scopeType: TargetScopeType;
  readonly label: string;
  readonly form: CreateForm;
  readonly targetScopeOptions: readonly TargetScopeOption[];
  readonly currency: string;
  readonly onChange: (patch: Partial<CreateForm>) => void;
}

/**
 * One Group-charge target step, parametrised by scope type (Branches /
 * Chapters / Batches). The operator sets a per-type default amount,
 * selects "all" or specific bodies of that type, and can override the
 * amount per body. A blank type-default falls back to the overall
 * Basics amount. All edits funnel through the parent form's flat
 * `chargeTargets` + `targetDefaults` so the payload stays one list.
 */
export function CreateChargeScopeTargetsStep({
  scopeType,
  label,
  form,
  targetScopeOptions,
  currency,
  onChange,
}: CreateChargeScopeTargetsStepProps) {
  const [q, setQ] = useState('');

  const typeOptions = useMemo(
    () => targetScopeOptions.filter((t) => t.scopeType === scopeType),
    [targetScopeOptions, scopeType],
  );
  const typeIds = useMemo(() => new Set(typeOptions.map((t) => t.id)), [typeOptions]);
  const typeLookup = useMemo(() => new Map(typeOptions.map((t) => [t.id, t])), [typeOptions]);

  const selectedOfType = useMemo(
    () => form.chargeTargets.filter((t) => typeIds.has(t.targetScopeId)),
    [form.chargeTargets, typeIds],
  );
  const selectedSet = useMemo(
    () => new Set(selectedOfType.map((t) => t.targetScopeId)),
    [selectedOfType],
  );

  const effectiveDefault = form.targetDefaults[scopeType] || form.baseAmount;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return typeOptions;
    return typeOptions.filter((t) => t.name.toLowerCase().includes(needle));
  }, [typeOptions, q]);

  const setDefault = (v: string) =>
    onChange({ targetDefaults: { ...form.targetDefaults, [scopeType]: v } });

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange({ chargeTargets: form.chargeTargets.filter((t) => t.targetScopeId !== id) });
      return;
    }
    const next: ChargeTargetDraft[] = [
      ...form.chargeTargets,
      { targetScopeId: id, amount: effectiveDefault },
    ];
    onChange({ chargeTargets: next });
  };

  const selectAll = () => {
    const additions: ChargeTargetDraft[] = typeOptions
      .filter((o) => !selectedSet.has(o.id))
      .map((o) => ({ targetScopeId: o.id, amount: effectiveDefault }));
    onChange({ chargeTargets: [...form.chargeTargets, ...additions] });
  };

  const clearType = () =>
    onChange({ chargeTargets: form.chargeTargets.filter((t) => !typeIds.has(t.targetScopeId)) });

  const setAmount = (id: string, amount: string) =>
    onChange({
      chargeTargets: form.chargeTargets.map((t) => (t.targetScopeId === id ? { ...t, amount } : t)),
    });

  const applyDefaultToType = () =>
    onChange({
      chargeTargets: form.chargeTargets.map((t) =>
        typeIds.has(t.targetScopeId) ? { ...t, amount: effectiveDefault } : t,
      ),
    });

  if (typeOptions.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium">{label}</div>
        <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
          No {label.toLowerCase()} are available as targets.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Default amount for {label.toLowerCase()}</label>
        <Input
          type="number"
          min="0"
          step="1"
          value={form.targetDefaults[scopeType]}
          onChange={(e) => setDefault(e.target.value)}
          placeholder={form.baseAmount || '0'}
          className="h-9 w-48 tabular-nums"
        />
        <p className="text-xs text-muted-foreground">
          Applied to every selected {label.toLowerCase().replace(/es$|s$/, '')} unless you override
          it below. Blank uses the overall default ({form.baseAmount || '—'} {currency}).
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {selectedOfType.length} of {typeOptions.length} selected
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={selectAll}
          >
            <ListChecks className="h-3 w-3" /> Select all
          </Button>
          {selectedOfType.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={clearType}
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Filter ${label.toLowerCase()}`}
            className="h-7 flex-1 border-0 bg-transparent p-0 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
          />
        </div>
        <ScrollArea className="max-h-80">
          <ul className="py-1">
            {filtered.map((t) => {
              const picked = selectedSet.has(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggle(t.id)}
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
                      {picked && <Check className="h-3 w-3" aria-hidden />}
                    </span>
                    <span className="flex-1 truncate">{t.name}</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-muted-foreground">No matches.</li>
            )}
          </ul>
        </ScrollArea>
      </div>

      <ChargeTargetAmountsTable
        targets={selectedOfType}
        targetLookup={typeLookup}
        defaultAmount={effectiveDefault}
        currency={currency}
        onAmountChange={setAmount}
        onRemove={(id) => toggle(id)}
        onApplyDefaultToAll={applyDefaultToType}
      />
    </div>
  );
}

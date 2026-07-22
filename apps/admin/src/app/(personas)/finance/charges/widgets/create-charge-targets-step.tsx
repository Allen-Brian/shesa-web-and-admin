'use client';

import { useMemo } from 'react';

import { ChargeTargetAmountsTable } from './charge-target-amounts-table';
import { ChargeTargetPicker } from './charge-target-picker';
import type { ChargeTargetDraft, CreateForm, TargetScopeOption } from './charges-types';

interface CreateChargeTargetsStepProps {
  readonly form: CreateForm;
  readonly targetScopeOptions: readonly TargetScopeOption[];
  readonly currency: string;
  readonly onChange: (patch: Partial<CreateForm>) => void;
}

/**
 * Wizard step 3 (Group only) — orchestrates the target picker and the
 * per-target amount table. Every mutation goes through
 * `chargeTargets` on the parent form; this file owns the array
 * ergonomics (toggle, edit, clear, apply-default).
 */
export function CreateChargeTargetsStep({
  form,
  targetScopeOptions,
  currency,
  onChange,
}: CreateChargeTargetsStepProps) {
  const targetLookup = useMemo(
    () => new Map(targetScopeOptions.map((t) => [t.id, t])),
    [targetScopeOptions],
  );
  const selectedIds = useMemo(
    () => form.chargeTargets.map((t) => t.targetScopeId),
    [form.chargeTargets],
  );

  const toggle = (id: string, next: boolean) => {
    if (next) {
      if (form.chargeTargets.some((t) => t.targetScopeId === id)) return;
      const nextTargets: ChargeTargetDraft[] = [
        ...form.chargeTargets,
        { targetScopeId: id, amount: form.baseAmount },
      ];
      onChange({ chargeTargets: nextTargets });
      return;
    }
    onChange({
      chargeTargets: form.chargeTargets.filter((t) => t.targetScopeId !== id),
    });
  };

  const setAmount = (id: string, amount: string) => {
    onChange({
      chargeTargets: form.chargeTargets.map((t) => (t.targetScopeId === id ? { ...t, amount } : t)),
    });
  };

  const clearAll = () => onChange({ chargeTargets: [] });

  const applyDefault = () => {
    if (!form.baseAmount) return;
    onChange({
      chargeTargets: form.chargeTargets.map((t) => ({ ...t, amount: form.baseAmount })),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-medium">Targets & amounts</div>
        <p className="text-xs text-muted-foreground">
          Pick branches and/or batches, then set how much each owes. The default from the previous
          step pre-fills new rows.
        </p>
      </div>

      <ChargeTargetPicker
        targetScopeOptions={targetScopeOptions}
        selectedIds={selectedIds}
        onToggle={toggle}
        onClearAll={clearAll}
      />

      <ChargeTargetAmountsTable
        targets={form.chargeTargets}
        targetLookup={targetLookup}
        defaultAmount={form.baseAmount}
        currency={currency}
        onAmountChange={setAmount}
        onRemove={(id) => toggle(id, false)}
        onApplyDefaultToAll={applyDefault}
      />
    </div>
  );
}

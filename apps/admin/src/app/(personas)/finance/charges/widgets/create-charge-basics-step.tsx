'use client';

import {
  Input,
  Label,
  NativeDateInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@shesa/ui';

import type { CreateForm, Recurrence, ScopeOption, TargetPartyType } from './charges-types';
import { RECURRENCES } from './charges-types';

interface CreateChargeBasicsStepProps {
  readonly form: CreateForm;
  readonly scopeOptions: readonly ScopeOption[];
  readonly onChange: (patch: Partial<CreateForm>) => void;
}

/**
 * Wizard step 2 — the always-required fields laid out in a two-column
 * grid to make the wider dialog feel intentional. Left column carries
 * the identity fields (scope, name, description); right column carries
 * the money + timing (amount, recurrence, activation). Base amount
 * reads as "default amount" on Group charges — it seeds the per-target
 * table on step 3 unless the operator overrides it.
 */
export function CreateChargeBasicsStep({
  form,
  scopeOptions,
  onChange,
}: CreateChargeBasicsStepProps) {
  const amountLabel = amountLabelFor(form.targetPartyType);
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="scope">Owner scope</Label>
          <Select value={form.scopeId} onValueChange={(v) => onChange({ scopeId: v })}>
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
          <span className="text-xs text-muted-foreground">
            Where money lands. Currency inherits from this scope.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={
              form.targetPartyType === 'branch' ? 'e.g. Branch Project Fund' : 'e.g. Monthly Dues'
            }
            maxLength={200}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What this charge is for."
            maxLength={2000}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">{amountLabel}</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="1"
            value={form.baseAmount}
            onChange={(e) => onChange({ baseAmount: e.target.value })}
            placeholder="25000"
          />
          {form.targetPartyType === 'branch' && (
            <span className="text-xs text-muted-foreground">
              Used to pre-fill each row on the next step. You can override per target.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="recurrence">Recurrence</Label>
          <Select
            value={form.recurrence}
            onValueChange={(v) => onChange({ recurrence: v as Recurrence })}
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="activation">Activation date</Label>
          <NativeDateInput
            id="activation"
            value={form.activationDate}
            onChange={(v) => onChange({ activationDate: v })}
          />
          <span className="text-xs text-muted-foreground">
            The instant arrears begin. Obligations for the current period generate from here.
          </span>
        </div>
      </div>
    </div>
  );
}

function amountLabelFor(type: TargetPartyType): string {
  return type === 'branch' ? 'Default amount' : 'Base amount';
}

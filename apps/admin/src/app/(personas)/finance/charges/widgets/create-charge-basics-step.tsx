'use client';

import {
  DatePicker,
  Input,
  Label,
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
 * Wizard step 2 — the always-required fields. The owner scope isn't
 * asked for (auto-derived by the parent from the operator's active
 * finance scope); we just surface which scope the charge will land at
 * for confirmation. Name, amount, recurrence, activation date live in
 * a two-column grid; description spans the full row so a longer
 * paragraph has room to breathe. Base amount reads as "default
 * amount" on Group charges — it seeds the per-target table on
 * step 3 unless the operator overrides it.
 */
export function CreateChargeBasicsStep({
  form,
  scopeOptions,
  onChange,
}: CreateChargeBasicsStepProps) {
  const amountLabel = amountLabelFor(form.targetPartyType);
  const ownerScope = scopeOptions.find((s) => s.id === form.scopeId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span>Landing at</span>
        <span className="font-medium text-foreground">{ownerScope?.name ?? 'your scope'}</span>
        <span>· currency</span>
        <span className="font-medium text-foreground">{ownerScope?.currency ?? 'XAF'}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
              Used to pre-fill each row on the next step. Override per target.
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
          <DatePicker
            id="activation"
            value={form.activationDate}
            onChange={(v) => onChange({ activationDate: v })}
            placeholder="Pick a date"
          />
          <span className="text-xs text-muted-foreground">
            The instant arrears begin. Obligations generate from here on activation.
          </span>
        </div>
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
  );
}

function amountLabelFor(type: TargetPartyType): string {
  return type === 'branch' ? 'Default amount' : 'Base amount';
}

'use client';

import { formatRecurrence } from '@/lib/format/recurrence';
import { formatCompactMoney } from '@/lib/finance/format-money';
import type { CreateForm, ScopeOption, TargetScopeOption } from './charges-types';

interface CreateChargeReviewStepProps {
  readonly form: CreateForm;
  readonly ownerScope: ScopeOption | undefined;
  readonly targetLookup: ReadonlyMap<string, TargetScopeOption>;
}

/**
 * Wizard step 4 — a read-only summary card before the user commits.
 * Money totals stay on the compact formatter for consistency with
 * the KPI strips; per-row target amounts render at full precision so
 * the review actually reveals typos.
 */
export function CreateChargeReviewStep({
  form,
  ownerScope,
  targetLookup,
}: CreateChargeReviewStepProps) {
  const currency = ownerScope?.currency ?? 'XAF';
  const total = form.chargeTargets.reduce((acc, t) => {
    const n = parseFloat(t.amount);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
  const isGroup = form.targetPartyType === 'branch';

  return (
    <div className="flex flex-col gap-3 text-sm">
      <SummaryRow label="Type" value={isGroup ? 'Group (per-target)' : 'Individual (per-member)'} />
      <SummaryRow label="Owner scope" value={ownerScope?.name ?? '(pick one)'} />
      <SummaryRow label="Name" value={form.name || '(no name)'} />
      {form.description && <SummaryRow label="Description" value={form.description} />}
      <SummaryRow
        label={isGroup ? 'Default amount' : 'Base amount'}
        value={form.baseAmount ? `${form.baseAmount} ${currency}` : '—'}
      />
      <SummaryRow label="Recurrence" value={formatRecurrence(form.recurrence, 1)} />
      <SummaryRow
        label="Activation"
        value={form.activationDate ? new Date(form.activationDate).toLocaleDateString() : '—'}
      />

      {isGroup && (
        <div className="mt-2 flex flex-col gap-2 rounded border bg-muted/30 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">Targets</span>
            <span className="text-muted-foreground">
              {form.chargeTargets.length} total · {formatCompactMoney(total, currency)}
            </span>
          </div>
          {form.chargeTargets.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              No targets picked yet — go back and add at least one.
            </span>
          ) : (
            <ul className="flex flex-col gap-1 text-xs">
              {form.chargeTargets.map((t) => {
                const scope = targetLookup.get(t.targetScopeId);
                return (
                  <li key={t.targetScopeId} className="flex items-center justify-between">
                    <span className="truncate">{scope?.name ?? '(unknown)'}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.amount || '0'} {currency}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b pb-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

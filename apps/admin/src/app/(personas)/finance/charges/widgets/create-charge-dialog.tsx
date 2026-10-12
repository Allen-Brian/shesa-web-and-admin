'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shesa/ui';

import { CreateChargeBasicsStep } from './create-charge-basics-step';
import { CreateChargeReviewStep } from './create-charge-review-step';
import { CreateChargeScopeTargetsStep } from './create-charge-scope-targets-step';
import type { CreateForm, ScopeOption, TargetScopeOption } from './charges-types';

interface CreateChargeDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly form: CreateForm;
  readonly onFormChange: (patch: Partial<CreateForm>) => void;
  readonly scopeOptions: readonly ScopeOption[];
  readonly targetScopeOptions: readonly TargetScopeOption[];
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

type StepKey = 'basics' | 'branches' | 'chapters' | 'batches' | 'review';

interface StepMeta {
  readonly key: StepKey;
  readonly title: string;
  readonly caption: string;
}

// The charge KIND is fixed by the operator's role (Mainstream → group
// levies; a branch/chapter → individual member charges), so there's no
// "Type" step — the parent view seeds targetPartyType before opening.
const INDIVIDUAL_STEPS: readonly StepMeta[] = [
  { key: 'basics', title: 'Basics', caption: 'Name, amount, cadence' },
  { key: 'review', title: 'Review', caption: 'Confirm and create' },
];

const GROUP_STEPS: readonly StepMeta[] = [
  { key: 'basics', title: 'Basics', caption: 'Name, default, cadence' },
  { key: 'branches', title: 'Branches', caption: 'Which branches pay' },
  { key: 'chapters', title: 'Chapters', caption: 'Which chapters pay' },
  { key: 'batches', title: 'Batches', caption: 'Which batches pay' },
  { key: 'review', title: 'Review', caption: 'Confirm and create' },
];

const SCOPE_STEP: Record<'branches' | 'chapters' | 'batches', 'branch' | 'chapter' | 'batch'> = {
  branches: 'branch',
  chapters: 'chapter',
  batches: 'batch',
};

/**
 * "New charge" wizard — a wide dialog with a vertical step rail on
 * the left and roomy step content on the right. Individual charges
 * skip Targets; Group charges include it. The rail marks steps you
 * have already passed with a check so the operator always sees where
 * they are without having to count.
 */
export function CreateChargeDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  scopeOptions,
  targetScopeOptions,
  onSubmit,
  pending,
}: CreateChargeDialogProps) {
  const steps = form.targetPartyType === 'branch' ? GROUP_STEPS : INDIVIDUAL_STEPS;
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex]?.key ?? 'basics';

  useEffect(() => {
    if (open) setStepIndex(0);
  }, [open]);
  useEffect(() => {
    if (stepIndex >= steps.length) setStepIndex(steps.length - 1);
  }, [steps.length, stepIndex]);

  const ownerScope = useMemo(
    () => scopeOptions.find((s) => s.id === form.scopeId),
    [scopeOptions, form.scopeId],
  );
  const targetLookup = useMemo(
    () => new Map(targetScopeOptions.map((t) => [t.id, t])),
    [targetScopeOptions],
  );

  const canAdvance = validateStep(step, form);
  const isLast = stepIndex === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-3xl overflow-y-auto p-0 sm:max-w-3xl">
        <div className="flex flex-col gap-0 sm:flex-row">
          <StepRail steps={steps} activeIndex={stepIndex} />

          <div className="flex min-w-0 flex-1 flex-col gap-4 p-6 sm:p-8">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                New charge
              </DialogTitle>
              <DialogDescription>
                {stepDescriptionFor(step, form.targetPartyType === 'branch')}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-1 flex-col gap-4">
              {step === 'basics' && (
                <CreateChargeBasicsStep
                  form={form}
                  scopeOptions={scopeOptions}
                  onChange={onFormChange}
                />
              )}
              {(step === 'branches' || step === 'chapters' || step === 'batches') && (
                <CreateChargeScopeTargetsStep
                  scopeType={SCOPE_STEP[step]}
                  label={steps[stepIndex]?.title ?? ''}
                  form={form}
                  targetScopeOptions={targetScopeOptions}
                  currency={ownerScope?.currency ?? 'XAF'}
                  onChange={onFormChange}
                />
              )}
              {step === 'review' && (
                <CreateChargeReviewStep
                  form={form}
                  ownerScope={ownerScope}
                  targetLookup={targetLookup}
                />
              )}
            </div>

            <DialogFooter className="flex-row items-center justify-between gap-2 border-t pt-4 sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Step {stepIndex + 1} of {steps.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  disabled={pending || stepIndex === 0}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  loading={pending}
                  disabled={pending}
                >
                  Cancel
                </Button>
                {isLast ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={onSubmit}
                    disabled={pending || !canAdvance}
                  >
                    Create draft
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                    disabled={pending || !canAdvance}
                  >
                    Next
                  </Button>
                )}
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function allTargetAmountsValid(form: CreateForm): boolean {
  return form.chargeTargets.every((t) => {
    const n = parseFloat(t.amount);
    return Number.isFinite(n) && n > 0;
  });
}

function validateStep(step: StepKey, form: CreateForm): boolean {
  if (step === 'basics') {
    if (!form.scopeId || !form.name.trim()) return false;
    const amt = parseFloat(form.baseAmount);
    if (!Number.isFinite(amt) || amt <= 0) return false;
    return !!form.activationDate;
  }
  // Each scope-type step may leave its own type empty (a charge can
  // cover branches only), but every amount already entered must be
  // positive before advancing.
  if (step === 'branches' || step === 'chapters' || step === 'batches') {
    return allTargetAmountsValid(form);
  }
  // Review: a Group charge needs at least one target overall.
  if (step === 'review' && form.targetPartyType === 'branch') {
    return form.chargeTargets.length > 0 && allTargetAmountsValid(form);
  }
  return true;
}

function stepDescriptionFor(step: StepKey, isGroup: boolean): string {
  if (step === 'basics') {
    return isGroup
      ? 'Give the charge a name, set the overall default amount + cadence. Each group step can override that default.'
      : 'Give the charge a name, pick the owner scope, and set the per-member amount + cadence.';
  }
  if (step === 'branches') {
    return 'Set a default for branches, then pick which branches this charge bills. Override any branch individually.';
  }
  if (step === 'chapters') {
    return 'Set a default for chapters, then pick which chapters this charge bills. Override any chapter individually.';
  }
  if (step === 'batches') {
    return 'Set a default for batches, then pick which batches this charge bills. Override any batch individually.';
  }
  return 'Everything checks out? Create the draft — activation is a separate step.';
}

interface StepRailProps {
  readonly steps: readonly StepMeta[];
  readonly activeIndex: number;
}

function StepRail({ steps, activeIndex }: StepRailProps) {
  return (
    <ol className="flex shrink-0 flex-row gap-1 border-b bg-muted/30 p-3 sm:w-56 sm:flex-col sm:gap-1 sm:border-b-0 sm:border-r sm:p-4">
      {steps.map((s, i) => {
        const active = i === activeIndex;
        const past = i < activeIndex;
        return (
          <li
            key={s.key}
            className={
              'flex flex-1 items-center gap-3 rounded-md px-2 py-2 transition-colors sm:flex-none ' +
              (active ? 'bg-background shadow-sm' : 'opacity-90')
            }
          >
            <span
              className={
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ' +
                (active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : past
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground')
              }
            >
              {past ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="flex min-w-0 flex-col leading-tight">
              <span
                className={
                  'text-sm font-medium ' +
                  (active
                    ? 'text-foreground'
                    : past
                      ? 'text-foreground/80'
                      : 'text-muted-foreground')
                }
              >
                {s.title}
              </span>
              <span className="hidden truncate text-[11px] text-muted-foreground sm:block">
                {s.caption}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

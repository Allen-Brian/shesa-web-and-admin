'use client';

import { useEffect, useMemo, useState } from 'react';

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
import { CreateChargeTargetsStep } from './create-charge-targets-step';
import { CreateChargeTypeStep } from './create-charge-type-step';
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

type StepKey = 'type' | 'basics' | 'targets' | 'review';

const INDIVIDUAL_STEPS: readonly StepKey[] = ['type', 'basics', 'review'];
const GROUP_STEPS: readonly StepKey[] = ['type', 'basics', 'targets', 'review'];

const STEP_LABEL: Record<StepKey, string> = {
  type: 'Type',
  basics: 'Basics',
  targets: 'Targets',
  review: 'Review',
};

/**
 * "New charge" wizard — 3 steps for Individual, 4 for Group. The
 * per-step forms live in sibling files; this shell just orchestrates
 * navigation and delegates the actual writes to the parent via
 * `onFormChange`. Cross-step validation is loose — Next simply
 * disables until the current step's required fields are set.
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
  const step = steps[stepIndex] ?? 'type';

  // Reset to step 1 whenever the dialog reopens; also snap back if the
  // step list shrinks because the user flipped from Group→Individual.
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New charge</DialogTitle>
          <DialogDescription>
            A charge starts as a draft; activate it when you&apos;re ready for the hourly sweep to
            fire.
          </DialogDescription>
        </DialogHeader>

        <StepBreadcrumbs steps={steps} activeIndex={stepIndex} />

        <div className="pt-1">
          {step === 'type' && (
            <CreateChargeTypeStep
              value={form.targetPartyType}
              onChange={(v) => onFormChange({ targetPartyType: v, chargeTargets: [] })}
            />
          )}
          {step === 'basics' && (
            <CreateChargeBasicsStep
              form={form}
              scopeOptions={scopeOptions}
              onChange={onFormChange}
            />
          )}
          {step === 'targets' && (
            <CreateChargeTargetsStep
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

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={pending || stepIndex === 0}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            {isLast ? (
              <Button type="button" size="sm" onClick={onSubmit} disabled={pending || !canAdvance}>
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
      </DialogContent>
    </Dialog>
  );
}

function validateStep(step: StepKey, form: CreateForm): boolean {
  if (step === 'type') return true;
  if (step === 'basics') {
    if (!form.scopeId || !form.name.trim()) return false;
    const amt = parseFloat(form.baseAmount);
    if (!Number.isFinite(amt) || amt <= 0) return false;
    return !!form.activationDate;
  }
  if (step === 'targets') {
    if (form.chargeTargets.length === 0) return false;
    return form.chargeTargets.every((t) => {
      const n = parseFloat(t.amount);
      return Number.isFinite(n) && n > 0;
    });
  }
  return true;
}

interface StepBreadcrumbsProps {
  readonly steps: readonly StepKey[];
  readonly activeIndex: number;
}

function StepBreadcrumbs({ steps, activeIndex }: StepBreadcrumbsProps) {
  return (
    <ol className="flex items-center gap-1 text-xs">
      {steps.map((s, i) => {
        const active = i === activeIndex;
        const past = i < activeIndex;
        return (
          <li key={s} className="flex items-center gap-1">
            <span
              className={
                'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ' +
                (active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : past
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground')
              }
            >
              {i + 1}
            </span>
            <span
              className={
                active
                  ? 'font-semibold text-foreground'
                  : past
                    ? 'text-foreground/80'
                    : 'text-muted-foreground'
              }
            >
              {STEP_LABEL[s]}
            </span>
            {i < steps.length - 1 && <span className="mx-1 text-muted-foreground/50">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

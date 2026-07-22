'use client';

import { Building2, User } from 'lucide-react';

import type { TargetPartyType } from './charges-types';

interface CreateChargeTypeStepProps {
  readonly value: TargetPartyType;
  readonly onChange: (v: TargetPartyType) => void;
}

/**
 * Wizard step 1 — Individual vs Group. Two big radio cards so the
 * distinction reads at a glance; the sub-labels remind the user what
 * each variant actually creates downstream (per-member obligations
 * vs one obligation per target scope).
 */
export function CreateChargeTypeStep({ value, onChange }: CreateChargeTypeStepProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TypeCard
        icon={<User className="h-5 w-5" />}
        title="Individual"
        summary="One obligation per member. Same amount for everyone."
        example="e.g. Monthly Dues, Association Levy"
        active={value === 'member'}
        onClick={() => onChange('member')}
      />
      <TypeCard
        icon={<Building2 className="h-5 w-5" />}
        title="Group"
        summary="One obligation per branch or batch, with per-target amounts."
        example="e.g. Branch Contribution, Batch Homecoming Levy"
        active={value === 'branch'}
        onClick={() => onChange('branch')}
      />
    </div>
  );
}

interface TypeCardProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly summary: string;
  readonly example: string;
  readonly active: boolean;
  readonly onClick: () => void;
}

function TypeCard({ icon, title, summary, example, active, onClick }: TypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition ' +
        (active
          ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
          : 'border-border hover:border-primary/40 hover:bg-muted/50')
      }
      aria-pressed={active}
    >
      <div className="flex items-center gap-2">
        <span
          className={
            'flex h-8 w-8 items-center justify-center rounded-md ' +
            (active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')
          }
        >
          {icon}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{summary}</p>
      <p className="text-[11px] italic text-muted-foreground">{example}</p>
    </button>
  );
}

export interface ContributionRow {
  readonly id: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly currency: string;
  readonly baseAmount: number | null;
  readonly goalAmount: number | null;
  readonly minAmount: number | null;
  readonly capacity: number | null;
  readonly lifecycle: string | null;
  readonly openDate: string | null;
  readonly closeDate: string | null;
  readonly status: string;
  readonly raised: number;
  readonly contributorCount: number;
  /** Event group this contribution belongs to, if any. */
  readonly groupId: string | null;
  readonly groupName: string | null;
}

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly currency: string;
}

export type SerialRow = ContributionRow & { readonly serial: number };
export type ContributionShape = 'goal' | 'open' | 'ticketed' | 'fixed';
export type LifecycleFilter = 'all' | 'draft' | 'open' | 'closed' | 'archived';

/** Shape catalogue rendered in the Shape select + helper subtitle. */
export const SHAPES: readonly { value: ContributionShape; label: string; help: string }[] = [
  { value: 'goal', label: 'Goal', help: 'Rally toward a group total. No per-member arrears.' },
  { value: 'open', label: 'Open', help: 'Any amount, no goal ceiling. Optional minimum.' },
  { value: 'ticketed', label: 'Ticketed', help: 'Fixed unit price with an optional capacity.' },
  {
    value: 'fixed',
    label: 'Fixed',
    help: 'Per-member fixed amount. Behaves like a one-off charge.',
  },
];

export interface CreateForm {
  scopeId: string;
  shape: ContributionShape;
  name: string;
  description: string;
  amount: string;
  capacity: string;
  openDate: string;
  closeDate: string;
}

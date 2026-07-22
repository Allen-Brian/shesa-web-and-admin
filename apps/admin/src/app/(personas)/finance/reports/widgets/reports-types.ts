import { AlertCircle, BarChart3, CreditCard, Gift, HandCoins, Tag, Wallet } from 'lucide-react';

import type {
  ArrearsRow,
  CollectionsRow,
  DonationReportRow,
  ExpenseByCategoryRow,
  PaymentMethodRow,
  ReportKey,
  TreasuryStatementRow,
} from '../actions';

/**
 * Shared types + catalogue constants for the reports view. Kept
 * outside the client widget so the server-side page loader can
 * `import type` from a single source without pulling the widget
 * bundle.
 */

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
}

/**
 * Event group option for the optional group narrower. `chargeIds`
 * carries every charge belonging to this group so the client can
 * filter report rows without a second RPC. The plan explicitly
 * defers SQL-level group awareness in the reporting fns.
 */
export interface GroupOption {
  readonly id: string;
  readonly name: string;
  readonly chargeIds: readonly string[];
}

export interface ReportCatalogueEntry {
  readonly value: ReportKey;
  readonly label: string;
  readonly description: string;
  readonly icon: typeof BarChart3;
  readonly usesDates: boolean;
  /** Tailwind class fragment used for the card's icon avatar. */
  readonly iconClass: string;
}

/** Every report the drop-in catalogue picker can offer. */
export const REPORTS: readonly ReportCatalogueEntry[] = [
  {
    value: 'collections',
    label: 'Collections',
    description: 'Money in per charge over a period.',
    icon: HandCoins,
    usesDates: true,
    iconClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  {
    value: 'arrears',
    label: 'Arrears',
    description: 'Who owes — open + partial obligations per member.',
    icon: AlertCircle,
    usesDates: false,
    iconClass: 'bg-destructive/10 text-destructive',
  },
  {
    value: 'treasury_statement',
    label: 'Treasury statement',
    description: 'Opening · income · expenses · closing.',
    icon: Wallet,
    usesDates: true,
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    value: 'payment_method_breakdown',
    label: 'Payment methods',
    description: 'How money arrived (cash / MoMo / Orange / …).',
    icon: CreditCard,
    usesDates: true,
    iconClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  },
  {
    value: 'expense_report_by_category',
    label: 'Expenses by category',
    description: 'Recorded + approved expenses grouped by category.',
    icon: Tag,
    usesDates: true,
    iconClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  {
    value: 'donation_report',
    label: 'Donations',
    description: 'Freewill income per campaign, named vs anonymous split.',
    icon: Gift,
    usesDates: true,
    iconClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  },
];

/**
 * Preset windows the operator can pick with a single click. `custom`
 * keeps the date inputs visible so the operator can dial in an exact
 * range without the presets getting in the way.
 */
export type Preset = '30d' | '90d' | 'mtd' | 'ytd' | 'all' | 'custom';

export const PRESETS: readonly { key: Preset; label: string }[] = [
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'mtd', label: 'Month to date' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

/**
 * Tagged-union row for the results DataTable. Each variant carries
 * the source `__report` marker so per-report renderers can narrow the
 * type without threading a separate discriminator through props.
 */
export type ResultRow =
  | ({ __report: 'collections' } & CollectionsRow)
  | ({ __report: 'arrears' } & ArrearsRow)
  | ({ __report: 'treasury_statement' } & TreasuryStatementRow)
  | ({ __report: 'payment_method_breakdown' } & PaymentMethodRow)
  | ({ __report: 'expense_report_by_category' } & ExpenseByCategoryRow)
  | ({ __report: 'donation_report' } & DonationReportRow);

export interface RunResult {
  readonly report: ReportKey;
  readonly rows: ResultRow[];
  readonly ranAt: string;
  readonly scopeName: string;
  readonly windowLabel: string;
  /**
   * Set when the run was narrowed to a group; drives the "· AGM 2026"
   * suffix on the result panel header. `null` when the run was
   * unrestricted.
   */
  readonly groupName: string | null;
}

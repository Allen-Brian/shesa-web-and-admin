import 'server-only';

import { activeFinanceScope } from '@/lib/finance/active-scope';
import { getServerClient } from '@/lib/supabase-server';

import type {
  DashboardData,
  RawExpense,
  RawLedgerEntry,
  RawMember,
  RawPayment,
  ScopeRow,
} from './dashboard-types';
import { buildActivity, buildDashboardKpis, buildPendingSummary } from './dashboard-stats';

const THIRTY_DAY_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_LIMIT = 8;

const EMPTY: DashboardData = {
  pendingExpenses: [],
  pendingSummary: { count: 0, totalByCurrency: new Map() },
  scopeById: new Map(),
  kpis: {
    income: 0,
    expensesSum: 0,
    netFlow: 0,
    currency: null,
    ongoingContributions: 0,
    txnsThisMonth: 0,
  },
  activity: [],
};

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Server-only loader for the finance dashboard.
 *
 * Every read is filtered to the caller's active finance scope —
 * Mainstream Finance sees mainstream-scope rows only; a branch-scoped
 * operator sees their own scopes. See `lib/finance/active-scope.ts`
 * for the rule.
 *
 * Load shape: last-30-day ledger for the Income/Expenses/Net KPI
 * strip, plus pending expenses + a small recent-activity feed.
 * No treasury-balance rollup — the persona doesn't need it (see
 * 2026-07 direction to reduce the dashboard to just those three
 * numbers).
 */
export async function loadFinanceDashboard(): Promise<DashboardData> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const active = await activeFinanceScope(user.id);
  if (!active) return EMPTY;

  const scopeIds = active.scopeIds;
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAY_MS);
  const monthStart = startOfCurrentMonth();

  const [
    { data: ledgerRaw },
    { data: pendingExpensesRaw },
    { data: recentPaymentsRaw },
    { data: recentExpensesRaw },
    { count: ongoingContributions },
    { count: txnsThisMonth },
  ] = await Promise.all([
    supabase
      .schema('finance')
      .from('ledger_entries')
      .select('id, scope_id, direction, amount, currency, payment_id, expense_id, memo, created_at')
      .in('scope_id', scopeIds)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .schema('finance')
      .from('expenses')
      .select('id, payee, amount, currency, scope_id, status, incurred_at, reverses_expense_id')
      .in('scope_id', scopeIds)
      .eq('status', 'pending_approval')
      .order('incurred_at', { ascending: false })
      .limit(10),
    supabase
      .schema('finance')
      .from('payments')
      .select('id, payer_member_id, method, metadata, reverses_payment_id')
      .in('scope_id', scopeIds)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .schema('finance')
      .from('expenses')
      .select('id, payee, amount, currency, scope_id, status, incurred_at, reverses_expense_id')
      .in('scope_id', scopeIds)
      .order('incurred_at', { ascending: false })
      .limit(30),
    // Ongoing contributions — donation / ticketed / goal / open / fixed
    // charges currently live at the active scope.
    supabase
      .schema('finance')
      .from('charges')
      .select('id', { count: 'exact', head: true })
      .in('scope_id', scopeIds)
      .in('shape', ['goal', 'open', 'ticketed', 'donation', 'fixed'])
      .eq('status', 'active')
      .eq('lifecycle', 'open'),
    // Non-reversal payments in the current calendar month at the active
    // scope. Reversals are excluded so the number represents fresh
    // movement rather than corrections.
    supabase
      .schema('finance')
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .in('scope_id', scopeIds)
      .gte('created_at', monthStart.toISOString())
      .is('reverses_payment_id', null),
  ]);

  const ledger = (ledgerRaw ?? []) as RawLedgerEntry[];
  const pendingExpenses = (pendingExpensesRaw ?? []) as RawExpense[];
  const paymentsMeta = (recentPaymentsRaw ?? []) as RawPayment[];
  const recentExpenses = (recentExpensesRaw ?? []) as RawExpense[];

  const scopeIdsForNames = Array.from(
    new Set([
      ...ledger.map((l) => l.scope_id),
      ...pendingExpenses.map((e) => e.scope_id),
      ...recentExpenses.map((e) => e.scope_id),
    ]),
  );

  const { data: scopeRows } = scopeIdsForNames.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type')
        .in('id', scopeIdsForNames)
    : { data: [] as ScopeRow[] };
  const scopeById = new Map(((scopeRows ?? []) as ScopeRow[]).map((s) => [s.id, s]));
  const paymentById = new Map(paymentsMeta.map((p) => [p.id, p]));

  const memberIds = Array.from(
    new Set(paymentsMeta.map((p) => p.payer_member_id).filter((x): x is string => !!x)),
  );
  const { data: memberRows } = memberIds.length
    ? await supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
    : { data: [] as RawMember[] };
  const memberById = new Map(((memberRows ?? []) as RawMember[]).map((m) => [m.id, m.full_name]));

  const kpis = buildDashboardKpis(ledger, {
    ongoingContributions: ongoingContributions ?? 0,
    txnsThisMonth: txnsThisMonth ?? 0,
  });
  const pendingSummary = buildPendingSummary(pendingExpenses);
  const activity = buildActivity({
    ledger,
    scopeById,
    paymentById,
    memberById,
    recentExpenses,
    limit: RECENT_LIMIT,
  });

  return { pendingExpenses, pendingSummary, scopeById, kpis, activity };
}

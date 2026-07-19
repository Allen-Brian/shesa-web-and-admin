import 'server-only';

import { getServerClient } from '@/lib/supabase-server';

import type {
  DashboardData,
  RawExpense,
  RawLedgerEntry,
  RawMember,
  RawPayment,
  ScopeRow,
  TreasuryRow,
} from './dashboard-types';
import { buildActivity, buildDashboardKpis, buildPendingSummary } from './dashboard-stats';

const THIRTY_DAY_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_LIMIT = 8;
const TOP_TREASURIES = 4;

/**
 * Server-only loader for the finance dashboard. Fans out 5 parallel
 * reads (treasuries + last-30-day ledger + pending expenses + recent
 * payments + recent expenses), then joins scope + member names in
 * two follow-up queries. Derived aggregates live in
 * `dashboard-stats.ts` so this file stays purely I/O.
 *
 * RLS on the finance schema filters visible rows to scopes the caller
 * holds `finance.read` at — that gate lives in the migration layer.
 */
export async function loadFinanceDashboard(): Promise<DashboardData> {
  const supabase = await getServerClient();
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAY_MS);

  const [
    { data: treasuriesRaw },
    { data: ledgerRaw },
    { data: pendingExpensesRaw },
    { data: recentPaymentsRaw },
    { data: recentExpensesRaw },
  ] = await Promise.all([
    supabase
      .schema('finance' as never)
      .from('treasury_balances' as never)
      .select('scope_id, balance, currency, updated_at'),
    supabase
      .schema('finance' as never)
      .from('ledger_entries' as never)
      .select('id, scope_id, direction, amount, currency, payment_id, expense_id, memo, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .schema('finance' as never)
      .from('expenses' as never)
      .select('id, payee, amount, currency, scope_id, status, incurred_at, reverses_expense_id')
      .eq('status', 'pending_approval')
      .order('incurred_at', { ascending: false })
      .limit(10),
    supabase
      .schema('finance' as never)
      .from('payments' as never)
      .select('id, payer_member_id, method, metadata, reverses_payment_id')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .schema('finance' as never)
      .from('expenses' as never)
      .select('id, payee, amount, currency, scope_id, status, incurred_at, reverses_expense_id')
      .order('incurred_at', { ascending: false })
      .limit(30),
  ]);

  const treasuries = (treasuriesRaw ?? []) as TreasuryRow[];
  const ledger = (ledgerRaw ?? []) as RawLedgerEntry[];
  const pendingExpenses = (pendingExpensesRaw ?? []) as RawExpense[];
  const paymentsMeta = (recentPaymentsRaw ?? []) as RawPayment[];
  const recentExpenses = (recentExpensesRaw ?? []) as RawExpense[];

  const scopeIds = Array.from(
    new Set([
      ...treasuries.map((t) => t.scope_id),
      ...ledger.map((l) => l.scope_id),
      ...pendingExpenses.map((e) => e.scope_id),
      ...recentExpenses.map((e) => e.scope_id),
    ]),
  );

  const { data: scopeRows } = scopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type')
        .in('id', scopeIds)
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

  const kpis = buildDashboardKpis(treasuries, ledger);
  const topTreasuries = treasuries
    .slice()
    .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
    .slice(0, TOP_TREASURIES);
  const pendingSummary = buildPendingSummary(pendingExpenses);
  const activity = buildActivity({
    ledger,
    scopeById,
    paymentById,
    memberById,
    recentExpenses,
    limit: RECENT_LIMIT,
  });

  return { treasuries, topTreasuries, pendingExpenses, pendingSummary, scopeById, kpis, activity };
}

import 'server-only';

import type { ChargeSummary } from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';
import { getServerClient } from '@/lib/supabase-server';

import {
  aggregateByMethod,
  aggregateBySource,
  buildCumulativeSeries,
  computeTimingStats,
  generateUpcomingPeriods,
} from './charge-detail-aggregators';
import type { RawCharge } from './charge-detail-raw-types';
import type { MatrixChargeDetail } from './charge-detail-types';
import {
  assembleMatrixMembers,
  buildMatrixPaymentLog,
  collectExistingPeriodKeys,
  computeMatrixTotals,
  periodsFromKeys,
  pickMatrixVariant,
  sumPaidByObligation,
} from './build-matrix-shape';
import {
  loadMemberJoinedAt,
  loadMemberNames,
  loadObligations,
  loadPaymentsByObligations,
  loadScopeBodies,
} from './matrix-loaders';

/**
 * Load the matrix branch of a charge — obligations fan out to
 * individual members (charge / fixed shapes). Each period becomes a
 * column; each member becomes a row; each cell is one obligation +
 * its rolled-up payments.
 *
 * The loader also fabricates the next N upcoming period columns so
 * the collection table paints them in an "Upcoming" state before the
 * obligation generator has run.
 */
export async function loadMatrixChargeDetail(
  charge: RawCharge,
  summary: ChargeSummary,
): Promise<MatrixChargeDetail> {
  const supabase = await getServerClient();

  const obligations = await loadObligations(supabase, charge.id);
  const payments = await loadPaymentsByObligations(
    supabase,
    obligations.map((o) => o.id),
  );

  const paidByObligation = sumPaidByObligation(payments);

  const memberIds = Array.from(
    new Set(obligations.filter((o) => o.party_type === 'member').map((o) => o.party_id)),
  );
  const [memberById, joinedAtByMember] = await Promise.all([
    loadMemberNames(supabase, memberIds),
    loadMemberJoinedAt(supabase, charge.scope_id, memberIds),
  ]);

  const scopeBodyIds = Array.from(
    new Set(obligations.filter((o) => o.party_type === 'branch').map((o) => o.party_id)),
  );
  const scopeBodyById = await loadScopeBodies(supabase, scopeBodyIds);

  const existingKeys = collectExistingPeriodKeys(obligations);
  const periods = periodsFromKeys(existingKeys, obligations);
  // generateUpcomingPeriods returns furthest-first; ascending places
  // future columns on the right in chronological order.
  const upcoming = generateUpcomingPeriods(charge, existingKeys).slice().reverse();
  const allPeriods = [...periods, ...upcoming];

  const members = assembleMatrixMembers({
    memberIds,
    memberById,
    joinedAtByMember,
    scopeBodyIds,
    scopeBodyById,
    obligations,
    allPeriods,
    paidByObligation,
  });

  const totals = computeMatrixTotals(obligations, paidByObligation);

  return {
    summary,
    mode: 'matrix',
    variant: pickMatrixVariant(obligations),
    expected: totals.expected,
    collected: totals.collected,
    periods: allPeriods,
    members,
    paymentsByMethod: aggregateByMethod(payments),
    paymentsBySource: aggregateBySource(payments),
    paymentTiming: computeTimingStats(payments),
    cumulativeSeries: buildCumulativeSeries(payments),
    paymentLog: buildMatrixPaymentLog(payments, memberById),
  };
}

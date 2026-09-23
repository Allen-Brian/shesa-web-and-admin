import type {
  MatrixCell,
  MatrixMember,
  MatrixPeriod,
  PoolPayment,
} from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';
import type { MemberContact } from '@/lib/finance/member-contacts';

import type { RawObligation, RawPayment } from './charge-detail-raw-types';

/**
 * Pure builders that turn the raw obligation + payment rows into the
 * matrix cells + member rows the client renders. Kept plain (no
 * `server-only`) so they compose with the loaders without dragging
 * server-only imports into unit tests.
 */

/** Roll payments up by obligation, signing reversals negative. */
export function sumPaidByObligation(payments: readonly RawPayment[]): Map<string, number> {
  const paidByObligation = new Map<string, number>();
  for (const p of payments) {
    if (!p.obligation_id) continue;
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    paidByObligation.set(p.obligation_id, (paidByObligation.get(p.obligation_id) ?? 0) + signed);
  }
  return paidByObligation;
}

/**
 * Existing period keys sorted ascending — `one-off` for the null
 * period_start rows so single-instalment charges still get one column.
 */
export function collectExistingPeriodKeys(obligations: readonly RawObligation[]): string[] {
  return Array.from(new Set(obligations.map((o) => o.period_start ?? 'one-off'))).sort();
}

/** Turn the sorted period-key list into `MatrixPeriod` entries. */
export function periodsFromKeys(
  keys: readonly string[],
  obligations: readonly RawObligation[],
): MatrixPeriod[] {
  return keys.map((key) => {
    const anyOb = obligations.find((o) => (o.period_start ?? 'one-off') === key);
    return {
      key,
      periodStart: anyOb?.period_start ?? null,
      periodEnd: anyOb?.period_end ?? null,
      isUpcoming: false,
    };
  });
}

/** Build the per-party cell array over the full (existing + upcoming) period list. */
export function buildMatrixCells(
  allPeriods: readonly MatrixPeriod[],
  partyObligations: readonly RawObligation[],
  paidByObligation: ReadonlyMap<string, number>,
): (MatrixCell | null)[] {
  return allPeriods.map((p) => {
    if (p.isUpcoming) return null;
    const ob = partyObligations.find((o) => (o.period_start ?? 'one-off') === p.key);
    if (!ob) return null;
    const paid = paidByObligation.get(ob.id) ?? 0;
    const owed = ob.amount;
    return {
      obligationId: ob.id,
      owed,
      paid,
      currency: ob.currency,
      status: ob.status,
      prorated: ob.prorated,
      periodEnd: ob.period_end,
    };
  });
}

/**
 * Reduce all obligations into portfolio-wide expected + collected
 * amounts. Reversals were already absorbed in `sumPaidByObligation`
 * so the collected total inherits the signing.
 */
export function computeMatrixTotals(
  obligations: readonly RawObligation[],
  paidByObligation: ReadonlyMap<string, number>,
): { expected: number; collected: number } {
  return obligations.reduce(
    (acc, o) => {
      acc.expected += o.amount;
      acc.collected += paidByObligation.get(o.id) ?? 0;
      return acc;
    },
    { expected: 0, collected: 0 },
  );
}

/**
 * `members` when any obligation has a per-member party; `scope-body`
 * only when every obligation is a scope-as-a-body collective. Drives
 * whether the Reports tab shows coverage / top-payers panels or the
 * payment log instead.
 */
export function pickMatrixVariant(obligations: readonly RawObligation[]): 'members' | 'scope-body' {
  const hasMemberObligations = obligations.some((o) => o.party_type === 'member');
  const hasScopeBodyObligations = obligations.some((o) => o.party_type === 'branch');
  return !hasMemberObligations && hasScopeBodyObligations ? 'scope-body' : 'members';
}

/**
 * Flat payment log sorted newest-first. Payer label falls back to
 * `donor_name` / "Anonymous donor" for public donations that don't
 * have a payer_member_id.
 */
export function buildMatrixPaymentLog(
  payments: readonly RawPayment[],
  memberById: ReadonlyMap<string, MemberContact>,
): PoolPayment[] {
  return payments
    .map((p): PoolPayment => {
      const meta = (p.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
      const member = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
      const label =
        member?.fullName ?? meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : '—');
      return {
        id: p.id,
        payerLabel: label,
        payerEmail: member?.email ?? null,
        payerPhone: member?.phone ?? null,
        payerBatch: member?.batchName ?? null,
        payerMemberCode: member?.memberCode ?? null,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        source: p.source,
        isReversal: !!p.reverses_payment_id,
        createdAt: p.created_at,
        obligationId: p.obligation_id,
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * Assemble the ordered `MatrixMember[]` — scope-body rows first so
 * collective obligations sit above the per-member fan-out; then
 * individual members alphabetised for stable scanning.
 */
export function assembleMatrixMembers(input: {
  readonly memberIds: readonly string[];
  readonly memberById: ReadonlyMap<string, MemberContact>;
  readonly joinedAtByMember: ReadonlyMap<string, string | null>;
  readonly scopeBodyIds: readonly string[];
  readonly scopeBodyById: ReadonlyMap<string, { name: string; scope_type: string }>;
  readonly obligations: readonly RawObligation[];
  readonly allPeriods: readonly MatrixPeriod[];
  readonly paidByObligation: ReadonlyMap<string, number>;
}): MatrixMember[] {
  const memberRows: MatrixMember[] = input.memberIds.map((mid) => {
    const member = input.memberById.get(mid);
    return {
      memberId: mid,
      fullName: member?.fullName ?? '(unknown)',
      email: member?.email ?? null,
      phone: member?.phone ?? null,
      batchName: member?.batchName ?? null,
      memberCode: member?.memberCode ?? null,
      joinedAt: input.joinedAtByMember.get(mid) ?? null,
      cells: buildMatrixCells(
        input.allPeriods,
        input.obligations.filter((o) => o.party_id === mid && o.party_type === 'member'),
        input.paidByObligation,
      ),
    };
  });
  const scopeBodyRows: MatrixMember[] = input.scopeBodyIds.map((sid) => {
    const scope = input.scopeBodyById.get(sid);
    return {
      memberId: sid,
      fullName: scope?.name ?? '(unknown scope)',
      cells: buildMatrixCells(
        input.allPeriods,
        input.obligations.filter((o) => o.party_id === sid && o.party_type === 'branch'),
        input.paidByObligation,
      ),
      isScopeBody: true,
      scopeType: scope?.scope_type ?? null,
    };
  });
  return [...scopeBodyRows, ...memberRows.sort((a, b) => a.fullName.localeCompare(b.fullName))];
}

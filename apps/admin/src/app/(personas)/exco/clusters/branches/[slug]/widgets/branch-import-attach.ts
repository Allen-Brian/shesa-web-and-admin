import type { SupabaseClient } from '@supabase/supabase-js';

import { extractInvokeMessage } from '@/lib/edge-invoke';

import type { AttachOutcome, AttachRow, ScopeCatalog } from './branch-import-types';

// Same widening rationale as branch-import-resolver.ts — per-call
// `.schema('core')` makes the outer generic irrelevant.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * Attach an already-known member to the branch scope by invoking the
 * request-join Edge Function with `adminAdded=true`. Returns the
 * outcome discriminant so the orchestrator can update its running
 * counters without knowing the invoke shape.
 *
 * Post-2026-07-05 the Edge Function creates the membership row as
 * `active` for admin-added flows; an existing membership returns 200
 * with the same envelope. We distinguish "created just now" from
 * "already there" via `createdNow` supplied by the caller.
 */
export async function attachKnownMemberToBranch(input: {
  supabase: AnySupabaseClient;
  scopeId: string;
  memberId: string;
  fullName: string;
  createdNow: boolean;
  identifier: string;
  rowIndex: number;
  row: AttachRow;
}): Promise<AttachOutcome> {
  const { data, error } = await input.supabase.functions.invoke('memberships/request-join-body', {
    body: { memberId: input.memberId, scopeId: input.scopeId, adminAdded: true },
  });
  if (error) {
    return {
      kind: 'failed',
      rowIndex: input.rowIndex,
      identifier: input.identifier,
      message: await extractInvokeMessage(error, 'Attach failed.'),
      row: input.row,
    };
  }
  const status = (data as { status?: 'pending' | 'active' } | null)?.status ?? 'active';
  if (input.createdNow) {
    return {
      kind: 'created_and_attached',
      rowIndex: input.rowIndex,
      memberId: input.memberId,
      fullName: input.fullName,
    };
  }
  if (status === 'pending') {
    return {
      kind: 'already_member',
      rowIndex: input.rowIndex,
      memberId: input.memberId,
      fullName: input.fullName,
    };
  }
  return {
    kind: 'attached',
    rowIndex: input.rowIndex,
    memberId: input.memberId,
    fullName: input.fullName,
  };
}

/**
 * Validate the create-a-new-member preconditions inline before we
 * spend an Edge-Function round-trip. Returns a `not_found` outcome
 * with a human-readable `reason` when the row cannot mint a member,
 * else `null` meaning "safe to attempt creation."
 */
export function checkCreateReadiness(
  row: AttachRow,
  rowIndex: number,
  identifier: string,
): AttachOutcome | null {
  const missing: string[] = [];
  if (!row.fullName?.trim()) missing.push('full_name');
  if (!row.email?.trim() && !row.phone?.trim()) missing.push('email or phone');
  if (row.batchEntryYear == null) missing.push('batch_entry_year');
  if (!row.house?.trim()) missing.push('house');
  if (!row.network?.trim()) missing.push('network');
  if (missing.length > 0) {
    return {
      kind: 'not_found',
      rowIndex,
      identifier,
      reason: `missing ${missing.join(', ')} — cannot create`,
      row,
    };
  }
  return null;
}

/**
 * Resolve the batch / house / network scope IDs by name. Returns a
 * `not_found` outcome when any of the three fail so the caller can
 * accumulate it and skip the create round-trip; else the three IDs.
 */
export function resolveCreateScopes(
  row: AttachRow,
  rowIndex: number,
  identifier: string,
  catalog: ScopeCatalog,
):
  | { ok: true; batchScopeId: string; houseScopeId: string; networkScopeId: string }
  | { ok: false; outcome: AttachOutcome } {
  const batchScopeId = catalog.batchesByYear.get(row.batchEntryYear!);
  const houseScopeId = catalog.housesByName.get(row.house!.trim().toLowerCase());
  const networkScopeId = catalog.networksByName.get(row.network!.trim().toLowerCase());
  if (!batchScopeId || !houseScopeId || !networkScopeId) {
    const unresolved = [
      !batchScopeId && `batch_entry_year=${row.batchEntryYear}`,
      !houseScopeId && `house=${row.house}`,
      !networkScopeId && `network=${row.network}`,
    ].filter(Boolean);
    return {
      ok: false,
      outcome: {
        kind: 'not_found',
        rowIndex,
        identifier,
        reason: `unknown ${unresolved.join(', ')}`,
        row,
      },
    };
  }
  return { ok: true, batchScopeId, houseScopeId, networkScopeId };
}

/**
 * Mint a new member via the create-member Edge Function using scope
 * IDs already resolved from the catalog. On failure returns a `failed`
 * outcome; on success returns the new member id so the orchestrator
 * can chain the attach step.
 */
export async function createMemberViaEdge(input: {
  supabase: AnySupabaseClient;
  row: AttachRow;
  rowIndex: number;
  identifier: string;
  batchScopeId: string;
  houseScopeId: string;
  networkScopeId: string;
}): Promise<{ ok: true; memberId: string } | { ok: false; outcome: AttachOutcome }> {
  const { row, supabase } = input;
  const { data: createData, error: createErr } = await supabase.functions.invoke(
    'members/create-member',
    {
      body: {
        fullName: row.fullName!.trim(),
        displayName: row.displayName?.trim() || null,
        email: row.email?.trim() ? row.email.trim().toLowerCase() : null,
        phone: row.phone?.trim() || null,
        batchScopeId: input.batchScopeId,
        houseScopeId: input.houseScopeId,
        networkScopeId: input.networkScopeId,
        field: row.field?.trim() || null,
        entryYear: row.entryYear ?? row.batchEntryYear ?? null,
        exitYear: row.exitYear ?? null,
        currentCountry: row.currentCountry?.trim() || null,
        currentRegionState: row.currentRegionState?.trim() || null,
        currentCity: row.currentCity?.trim() || null,
      },
    },
  );

  if (createErr) {
    return {
      ok: false,
      outcome: {
        kind: 'failed',
        rowIndex: input.rowIndex,
        identifier: input.identifier,
        message: await extractInvokeMessage(createErr, 'Could not create member.'),
        row,
      },
    };
  }
  const newMemberId = (createData as { memberId?: string } | null)?.memberId ?? null;
  if (!newMemberId) {
    return {
      ok: false,
      outcome: {
        kind: 'failed',
        rowIndex: input.rowIndex,
        identifier: input.identifier,
        message: 'Create call succeeded but returned no member id.',
        row,
      },
    };
  }
  return { ok: true, memberId: newMemberId };
}

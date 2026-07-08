'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Branch member import = "get-or-create + attach to this branch".
 *
 * Batches remain the single system entry-point for MINTING member
 * identities (2026-07-05 lock). The branch flow builds ON that: for
 * each import row we first try to resolve an existing member by
 * email / phone / member_code. If we find one, we just attach a
 * membership at this branch. If we don't, we mint a new member first
 * (batch → house → network resolved by name), then attach.
 *
 * Row shape (matches the batch import CSV so operators can share the
 * same file):
 *   full_name (required for create), email OR phone (at least one),
 *   member_code (optional identifier), batch_entry_year (required for
 *   create), house, network, field, entry_year, exit_year,
 *   current_country, current_region_state, current_city.
 *
 * Per-row lookup precedence: member_code → email (case-insensitive) →
 * phone (verbatim). First hit wins.
 */

export interface AttachRow {
  readonly fullName?: string | null;
  readonly displayName?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly memberCode?: string | null;
  readonly batchEntryYear?: number | null;
  readonly house?: string | null;
  readonly network?: string | null;
  readonly field?: string | null;
  readonly entryYear?: number | null;
  readonly exitYear?: number | null;
  readonly currentCountry?: string | null;
  readonly currentRegionState?: string | null;
  readonly currentCity?: string | null;
}

export type AttachOutcome =
  | {
      readonly kind: 'attached';
      readonly rowIndex: number;
      readonly memberId: string;
      readonly fullName: string;
    }
  | {
      readonly kind: 'created_and_attached';
      readonly rowIndex: number;
      readonly memberId: string;
      readonly fullName: string;
    }
  | {
      readonly kind: 'already_member';
      readonly rowIndex: number;
      readonly memberId: string;
      readonly fullName: string;
    }
  | {
      readonly kind: 'not_found';
      readonly rowIndex: number;
      readonly identifier: string;
      readonly reason: string;
      readonly row: AttachRow;
    }
  | {
      readonly kind: 'failed';
      readonly rowIndex: number;
      readonly identifier: string;
      readonly message: string;
      readonly row: AttachRow;
    };

export interface AttachSummary {
  readonly total: number;
  readonly attached: number;
  readonly created: number;
  readonly alreadyMember: number;
  readonly notFound: number;
  readonly failed: number;
  readonly outcomes: readonly AttachOutcome[];
}

interface MemberRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  member_code: string;
}

export async function attachExistingMembersToBranch(input: {
  scopeId: string;
  branchSlug: string;
  rows: readonly AttachRow[];
}): Promise<{ ok: true; summary: AttachSummary } | { ok: false; message: string }> {
  try {
    return await attachExistingMembersToBranchInner(input);
  } catch (err) {
    // Anything the inner path didn't map (network flap, unexpected
    // schema error, whatever) surfaces here. Return a clean envelope
    // rather than letting the Server Action reject — reject text
    // would leak raw Postgres messages like "new row violates
    // row-level security policy" to the client toast.
    const message = err instanceof Error ? err.message : 'Unexpected error during import.';
    console.error(
      JSON.stringify({
        level: 'error',
        area: 'branch-import',
        scopeId: input.scopeId,
        branchSlug: input.branchSlug,
        message: 'attachExistingMembersToBranch threw',
        error: message,
      }),
    );
    return {
      ok: false,
      message: `Import halted with an unexpected error: ${message.slice(0, 200)}`,
    };
  }
}

async function attachExistingMembersToBranchInner(input: {
  scopeId: string;
  branchSlug: string;
  rows: readonly AttachRow[];
}): Promise<{ ok: true; summary: AttachSummary } | { ok: false; message: string }> {
  const supabase = await getServerClient();
  const rows = input.rows;

  // ── Bulk-resolve rows by identifier in three flat queries. --------
  const emails = new Set<string>();
  const phones = new Set<string>();
  const codes = new Set<string>();
  for (const r of rows) {
    if (r.memberCode?.trim()) codes.add(r.memberCode.trim());
    if (r.email?.trim()) emails.add(r.email.trim().toLowerCase());
    if (r.phone?.trim()) phones.add(r.phone.trim());
  }

  const byCode = new Map<string, MemberRow>();
  const byEmail = new Map<string, MemberRow>();
  const byPhone = new Map<string, MemberRow>();
  const collect = (arr: readonly MemberRow[]) => {
    for (const m of arr) {
      byCode.set(m.member_code, m);
      if (m.email) byEmail.set(m.email.toLowerCase(), m);
      if (m.phone) byPhone.set(m.phone, m);
    }
  };

  if (codes.size) {
    const { data } = await supabase
      .schema('core')
      .from('members')
      .select('id, full_name, email, phone, member_code')
      .in('member_code', Array.from(codes));
    collect((data ?? []) as MemberRow[]);
  }
  if (emails.size) {
    const { data } = await supabase
      .schema('core')
      .from('members')
      .select('id, full_name, email, phone, member_code')
      .in('email', Array.from(emails));
    collect((data ?? []) as MemberRow[]);
  }
  if (phones.size) {
    const { data } = await supabase
      .schema('core')
      .from('members')
      .select('id, full_name, email, phone, member_code')
      .in('phone', Array.from(phones));
    collect((data ?? []) as MemberRow[]);
  }

  // ── Seed catalog for name-to-scope resolution (batch/house/network).
  const { data: seedRows } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, scope_type, entry_year')
    .in('scope_type', ['batch', 'house', 'network']);

  const batchesByYear = new Map<number, string>();
  const housesByName = new Map<string, string>();
  const networksByName = new Map<string, string>();
  for (const s of (seedRows ?? []) as Array<{
    id: string;
    name: string;
    scope_type: string;
    entry_year: number | null;
  }>) {
    const key = s.name.trim().toLowerCase();
    if (s.scope_type === 'batch' && s.entry_year != null) batchesByYear.set(s.entry_year, s.id);
    else if (s.scope_type === 'house') housesByName.set(key, s.id);
    else if (s.scope_type === 'network') networksByName.set(key, s.id);
  }

  const outcomes: AttachOutcome[] = [];
  let attached = 0;
  let created = 0;
  let alreadyMember = 0;
  let notFound = 0;
  let failed = 0;

  const attachTo = async (
    memberId: string,
    fullName: string,
    createdNow: boolean,
    identifier: string,
    rowIndex: number,
    row: AttachRow,
  ) => {
    const { data, error } = await supabase.functions.invoke('memberships/request-join-body', {
      body: { memberId, scopeId: input.scopeId, adminAdded: true },
    });
    if (error) {
      outcomes.push({
        kind: 'failed',
        rowIndex,
        identifier,
        message: await extractInvokeMessage(error, 'Attach failed.'),
        row,
      });
      failed += 1;
      return;
    }
    const status = (data as { status?: 'pending' | 'active' } | null)?.status ?? 'active';
    // Post-2026-07-05 request-join-body with adminAdded=true creates
    // membership rows as 'active'. An existing membership returns 200
    // with the same shape; we distinguish by whether the caller
    // created the member THIS run.
    if (createdNow) {
      outcomes.push({ kind: 'created_and_attached', rowIndex, memberId, fullName });
      created += 1;
    } else if (status === 'pending') {
      outcomes.push({ kind: 'already_member', rowIndex, memberId, fullName });
      alreadyMember += 1;
    } else {
      outcomes.push({ kind: 'attached', rowIndex, memberId, fullName });
      attached += 1;
    }
  };

  for (const [i, r] of rows.entries()) {
    const identifier =
      r.memberCode?.trim() ||
      r.email?.trim() ||
      r.phone?.trim() ||
      r.fullName?.trim() ||
      `row ${i + 1}`;

    const match =
      (r.memberCode?.trim() && byCode.get(r.memberCode.trim())) ||
      (r.email?.trim() && byEmail.get(r.email.trim().toLowerCase())) ||
      (r.phone?.trim() && byPhone.get(r.phone.trim())) ||
      null;

    if (match) {
      await attachTo(match.id, match.full_name, false, identifier, i, r);
      continue;
    }

    // No existing member → create then attach. Validate the minimum
    // creation shape here so we don't waste an edge-fn round-trip on
    // rows that obviously can't create.
    const missing: string[] = [];
    if (!r.fullName?.trim()) missing.push('full_name');
    if (!r.email?.trim() && !r.phone?.trim()) missing.push('email or phone');
    if (r.batchEntryYear == null) missing.push('batch_entry_year');
    if (!r.house?.trim()) missing.push('house');
    if (!r.network?.trim()) missing.push('network');
    if (missing.length > 0) {
      outcomes.push({
        kind: 'not_found',
        rowIndex: i,
        identifier,
        reason: `missing ${missing.join(', ')} — cannot create`,
        row: r,
      });
      notFound += 1;
      continue;
    }

    const batchScopeId = batchesByYear.get(r.batchEntryYear!);
    const houseScopeId = housesByName.get(r.house!.trim().toLowerCase());
    const networkScopeId = networksByName.get(r.network!.trim().toLowerCase());
    if (!batchScopeId || !houseScopeId || !networkScopeId) {
      const unresolved = [
        !batchScopeId && `batch_entry_year=${r.batchEntryYear}`,
        !houseScopeId && `house=${r.house}`,
        !networkScopeId && `network=${r.network}`,
      ].filter(Boolean);
      outcomes.push({
        kind: 'not_found',
        rowIndex: i,
        identifier,
        reason: `unknown ${unresolved.join(', ')}`,
        row: r,
      });
      notFound += 1;
      continue;
    }

    const { data: createData, error: createErr } = await supabase.functions.invoke(
      'members/create-member',
      {
        body: {
          fullName: r.fullName!.trim(),
          displayName: r.displayName?.trim() || null,
          email: r.email?.trim() ? r.email.trim().toLowerCase() : null,
          phone: r.phone?.trim() || null,
          batchScopeId,
          houseScopeId,
          networkScopeId,
          field: r.field?.trim() || null,
          entryYear: r.entryYear ?? r.batchEntryYear ?? null,
          exitYear: r.exitYear ?? null,
          currentCountry: r.currentCountry?.trim() || null,
          currentRegionState: r.currentRegionState?.trim() || null,
          currentCity: r.currentCity?.trim() || null,
        },
      },
    );

    if (createErr) {
      outcomes.push({
        kind: 'failed',
        rowIndex: i,
        identifier,
        message: await extractInvokeMessage(createErr, 'Could not create member.'),
        row: r,
      });
      failed += 1;
      continue;
    }
    const newMemberId = (createData as { memberId?: string } | null)?.memberId ?? null;
    if (!newMemberId) {
      outcomes.push({
        kind: 'failed',
        rowIndex: i,
        identifier,
        message: 'Create call succeeded but returned no member id.',
        row: r,
      });
      failed += 1;
      continue;
    }

    await attachTo(newMemberId, r.fullName!.trim(), true, identifier, i, r);
  }

  revalidatePath(`/exco/clusters/branches/${input.branchSlug}`);

  return {
    ok: true,
    summary: {
      total: rows.length,
      attached,
      created,
      alreadyMember,
      notFound,
      failed,
      outcomes,
    },
  };
}

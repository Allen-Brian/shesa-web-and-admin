'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import {
  attachKnownMemberToBranch,
  checkCreateReadiness,
  createMemberViaEdge,
  resolveCreateScopes,
} from './branch-import-attach';
import {
  identifierFor,
  loadScopeCatalog,
  matchByLookup,
  resolveExistingMembers,
} from './branch-import-resolver';
import type { AttachOutcome, AttachRow, AttachSummary } from './branch-import-types';

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
 *
 * The heavy lifting lives in sibling helpers:
 *   - `branch-import-resolver`  — bulk member lookup + scope catalog
 *   - `branch-import-attach`    — per-row create + attach Edge calls
 * This file is the outer transaction envelope: error-mapping, running
 * counters, revalidatePath.
 */

export async function attachExistingMembersToBranch(input: {
  scopeId: string;
  branchSlug: string;
  rows: readonly AttachRow[];
}): Promise<{ ok: true; summary: AttachSummary } | { ok: false; message: string }> {
  try {
    return await runImport(input);
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

async function runImport(input: {
  scopeId: string;
  branchSlug: string;
  rows: readonly AttachRow[];
}): Promise<{ ok: true; summary: AttachSummary }> {
  const supabase = await getServerClient();
  const rows = input.rows;

  const [lookup, catalog] = await Promise.all([
    resolveExistingMembers(supabase, rows),
    loadScopeCatalog(supabase),
  ]);

  const outcomes: AttachOutcome[] = [];
  const counters = { attached: 0, created: 0, alreadyMember: 0, notFound: 0, failed: 0 };
  const record = (o: AttachOutcome) => {
    outcomes.push(o);
    if (o.kind === 'attached') counters.attached += 1;
    else if (o.kind === 'created_and_attached') counters.created += 1;
    else if (o.kind === 'already_member') counters.alreadyMember += 1;
    else if (o.kind === 'not_found') counters.notFound += 1;
    else counters.failed += 1;
  };

  for (const [i, r] of rows.entries()) {
    const identifier = identifierFor(r, i);
    const match = matchByLookup(r, lookup);

    if (match) {
      record(
        await attachKnownMemberToBranch({
          supabase,
          scopeId: input.scopeId,
          memberId: match.id,
          fullName: match.full_name,
          createdNow: false,
          identifier,
          rowIndex: i,
          row: r,
        }),
      );
      continue;
    }

    const readiness = checkCreateReadiness(r, i, identifier);
    if (readiness) {
      record(readiness);
      continue;
    }

    const scopes = resolveCreateScopes(r, i, identifier, catalog);
    if (!scopes.ok) {
      record(scopes.outcome);
      continue;
    }

    const created = await createMemberViaEdge({
      supabase,
      row: r,
      rowIndex: i,
      identifier,
      batchScopeId: scopes.batchScopeId,
      houseScopeId: scopes.houseScopeId,
      networkScopeId: scopes.networkScopeId,
    });
    if (!created.ok) {
      record(created.outcome);
      continue;
    }

    record(
      await attachKnownMemberToBranch({
        supabase,
        scopeId: input.scopeId,
        memberId: created.memberId,
        fullName: r.fullName!.trim(),
        createdNow: true,
        identifier,
        rowIndex: i,
        row: r,
      }),
    );
  }

  revalidatePath(`/exco/clusters/branches/${input.branchSlug}`);

  return {
    ok: true,
    summary: {
      total: rows.length,
      ...counters,
      outcomes,
    },
  };
}

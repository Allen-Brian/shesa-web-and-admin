import type { SupabaseClient } from '@supabase/supabase-js';

import type { AttachRow, MemberLookup, MemberRow, ScopeCatalog } from './branch-import-types';

// Per-query `.schema('core')` calls make the outer client's
// pre-scoped generic irrelevant. Widen the type to `any` so the helper
// composes with the app's server client without a chain of casts —
// same convention as `lib/memberships/memberable-scopes.ts`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * Bulk-resolve every incoming row against `core.members` in three
 * flat queries (by member_code, by email, by phone) then merge the
 * results into per-identifier maps for O(1) row lookup.
 *
 * The three separate queries beat one big OR — the underlying indexes
 * are per-column, and PostgREST won't compose the OR into an index
 * scan for a mixed set of identifiers.
 */
export async function resolveExistingMembers(
  supabase: AnySupabaseClient,
  rows: readonly AttachRow[],
): Promise<MemberLookup> {
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

  const select = 'id, full_name, email, phone, member_code';
  if (codes.size) {
    const { data } = await supabase
      .schema('core')
      .from('members')
      .select(select)
      .in('member_code', Array.from(codes));
    collect((data ?? []) as MemberRow[]);
  }
  if (emails.size) {
    const { data } = await supabase
      .schema('core')
      .from('members')
      .select(select)
      .in('email', Array.from(emails));
    collect((data ?? []) as MemberRow[]);
  }
  if (phones.size) {
    const { data } = await supabase
      .schema('core')
      .from('members')
      .select(select)
      .in('phone', Array.from(phones));
    collect((data ?? []) as MemberRow[]);
  }

  return { byCode, byEmail, byPhone };
}

/**
 * Seed catalog for the create-new-member branch: batch/house/network
 * scope resolution keyed by entry_year (batches) or lowercased name
 * (houses + networks).
 */
export async function loadScopeCatalog(supabase: AnySupabaseClient): Promise<ScopeCatalog> {
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
  return { batchesByYear, housesByName, networksByName };
}

/**
 * Precedence: member_code → email (case-insensitive) → phone
 * (verbatim). First hit wins.
 */
export function matchByLookup(row: AttachRow, lookup: MemberLookup): MemberRow | null {
  const code = row.memberCode?.trim();
  if (code) {
    const hit = lookup.byCode.get(code);
    if (hit) return hit;
  }
  const email = row.email?.trim();
  if (email) {
    const hit = lookup.byEmail.get(email.toLowerCase());
    if (hit) return hit;
  }
  const phone = row.phone?.trim();
  if (phone) {
    const hit = lookup.byPhone.get(phone);
    if (hit) return hit;
  }
  return null;
}

export function identifierFor(row: AttachRow, rowIndex: number): string {
  return (
    row.memberCode?.trim() ||
    row.email?.trim() ||
    row.phone?.trim() ||
    row.fullName?.trim() ||
    `row ${rowIndex + 1}`
  );
}

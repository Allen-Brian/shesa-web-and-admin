import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

// Same widening rationale as the other finance loaders — a per-query
// `.schema('core')` makes the outer generic irrelevant.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

/**
 * The person behind a payment, as a report needs them.
 *
 * Finance tables show a payer's name and, for public payments, whatever
 * contact details the form collected. Member payments carried neither —
 * the name came from a `full_name` lookup and the contact columns stayed
 * null, because a signed-in member types nothing into a form.
 *
 * That was fine while these tables were only read on screen, where the
 * member record is one click away. It stops being fine the moment a
 * sheet is exported and sent to somebody who cannot click anything: a
 * list of names with no way to reach any of them is not a list anybody
 * can act on. So the exports resolve the member record, and the contact
 * details, batch and member code ride along with the name.
 */
export interface MemberContact {
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
  /** Batch scope name, e.g. "Class of 2014". Null if the scope is gone. */
  readonly batchName: string | null;
  readonly memberCode: string | null;
}

interface RawMember {
  readonly id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batch_scope_id: string | null;
  readonly member_code: string | null;
}

/**
 * Resolves a set of member ids to their name, contact details, batch
 * and member code in two queries — the members, then the batch scopes
 * they point at. Returns an empty map for an empty input rather than
 * issuing a query with an empty `in` list.
 */
export async function loadMemberContacts(
  supabase: AnySupabaseClient,
  memberIds: readonly string[],
): Promise<Map<string, MemberContact>> {
  if (memberIds.length === 0) return new Map();

  const { data } = await supabase
    .schema('core')
    .from('members')
    .select('id, full_name, email, phone, batch_scope_id, member_code')
    .in('id', memberIds as string[]);

  const members = (data ?? []) as RawMember[];

  const batchIds = Array.from(
    new Set(members.map((m) => m.batch_scope_id).filter((id): id is string => !!id)),
  );
  const { data: batchRows } = batchIds.length
    ? await supabase.schema('core').from('scopes').select('id, name').in('id', batchIds)
    : { data: [] as Array<{ id: string; name: string }> };

  const batchById = new Map(
    ((batchRows ?? []) as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]),
  );

  return new Map(
    members.map((m) => [
      m.id,
      {
        fullName: m.full_name,
        email: m.email,
        phone: m.phone,
        batchName: m.batch_scope_id ? (batchById.get(m.batch_scope_id) ?? null) : null,
        memberCode: m.member_code,
      },
    ]),
  );
}

/**
 * Server-side access to the SHESA Leadership Awards nomination round.
 *
 * Everything here goes through the definer RPCs in the `awards` schema.
 * `anon` holds no grant on any table in it, so there is no other route —
 * which is deliberate: the same tables carry awards an editor has hidden
 * and nominations nobody outside the secretariat should read.
 */

import 'server-only';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

import { clientEnv } from '@shesa/config/env.client';

import { getServerClient } from './supabase-server';

/** Where a cycle stands, derived from its two windows by `awards.phase()`. */
export type AwardsPhase = 'upcoming' | 'nominating' | 'review' | 'voting' | 'closed';

export interface AwardsEdition {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly phase: AwardsPhase;
  readonly nominationsOpenAt: string | null;
  readonly nominationsCloseAt: string | null;
  readonly votingOpenAt: string | null;
  readonly votingCloseAt: string | null;
}

export interface AwardCategory {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}

export interface Award {
  readonly id: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly description: string | null;
}

export interface AwardsState {
  readonly edition: AwardsEdition | null;
  readonly categories: readonly AwardCategory[];
  readonly awards: readonly Award[];
}

export interface BranchOption {
  readonly id: string;
  readonly name: string;
  /** `branch` or `chapter` — the form groups them under separate headings. */
  readonly kind: string;
}

const EMPTY: AwardsState = { edition: null, categories: [], awards: [] };

/* The RPC returns one jsonb document rather than three result sets, so the
   page renders from a single round trip. These shapes mirror what
   `awards.public_state()` builds — change them together. */
interface RawState {
  edition: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    phase: string;
    nominations_open_at: string | null;
    nominations_close_at: string | null;
    voting_open_at: string | null;
    voting_close_at: string | null;
  } | null;
  categories?: Array<{ id: string; name: string; description: string | null }>;
  awards?: Array<{
    id: string;
    category_id: string | null;
    name: string;
    description: string | null;
  }>;
}

/** The current cycle: its phase, its categories, and its visible awards. */
export async function getAwardsState(slug?: string): Promise<AwardsState> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.schema('awards').rpc('public_state', {
    p_edition_slug: slug ?? undefined,
  });

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.awards.getAwardsState',
        message: 'public_state failed',
        error: error.message,
      }),
    );
    return EMPTY;
  }

  const raw = data as unknown as RawState | null;
  if (!raw?.edition) return EMPTY;

  return {
    edition: {
      id: raw.edition.id,
      slug: raw.edition.slug,
      name: raw.edition.name,
      description: raw.edition.description,
      phase: raw.edition.phase as AwardsPhase,
      nominationsOpenAt: raw.edition.nominations_open_at,
      nominationsCloseAt: raw.edition.nominations_close_at,
      votingOpenAt: raw.edition.voting_open_at,
      votingCloseAt: raw.edition.voting_close_at,
    },
    categories: raw.categories ?? [],
    awards: (raw.awards ?? []).map((a) => ({
      id: a.id,
      categoryId: a.category_id,
      name: a.name,
      description: a.description,
    })),
  };
}

/**
 * Branches and country chapters, for the optional affiliation field.
 *
 * Empty is a normal answer, not an error: the register holds five
 * Cameroonian branches today. The form falls back to a free-text box, so a
 * nomination is never blocked by an incomplete register.
 */
export async function getBranchOptions(): Promise<readonly BranchOption[]> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.schema('awards').rpc('branches');

  if (error || !Array.isArray(data)) return [];
  return data.map((b) => ({ id: b.scope_id, name: b.name, kind: b.kind }));
}

/**
 * The caller's address, salted and hashed.
 *
 * Nominations arrive through a Server Action, so Postgres only ever sees
 * this server's address — the visitor's is in the request headers and
 * nowhere else. It is hashed here so the table never becomes a log of who
 * browsed the site from where, following `throttleKey()` in
 * `./agm-registration`.
 */
async function ipHash(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || h.get('cf-connecting-ip') || h.get('x-real-ip');
  if (!ip) return null;
  return createHash('sha256')
    .update(`awards:${clientEnv.NEXT_PUBLIC_APP_BASE_DOMAIN}:${ip}`)
    .digest('hex');
}

export interface NominationInput {
  readonly awardId: string;
  readonly nomineeName: string;
  readonly citation: string;
  /** `shesa:visitor-id` from the browser — see `./content-metrics`. */
  readonly deviceId: string;
  readonly nomineeBatchYear?: number | null;
  readonly nomineeBranchLabel?: string | null;
  readonly nomineeContact?: string | null;
  readonly nominatorName?: string | null;
  readonly nominatorBatchYear?: number | null;
  readonly nominatorBranchLabel?: string | null;
  readonly nominatorContact?: string | null;
}

export type NominationResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

/**
 * What each refusal from `awards.submit_nomination` means to the person
 * holding the phone. The RPC returns a reason rather than raising, because
 * every one of these is something the form has to say out loud.
 */
const REASONS = {
  unknown_award: 'That award is no longer open for nominations.',
  nominations_closed: 'Nominations have closed. Thank you — voting opens on 25 September.',
  bad_device:
    'Your browser is blocking the storage we use to keep nominations unique. Try again outside private browsing.',
  incomplete: 'Please give a name and a line or two on why you are putting them forward.',
  already_nominated: 'You have already nominated this person for this award.',
  throttled: 'That is a lot of nominations from one connection. Please try again later today.',
} as const satisfies Record<string, string>;

/** Put one name forward. */
export async function submitNomination(input: NominationInput): Promise<NominationResult> {
  if (input.nomineeName.trim().length < 2) {
    return { ok: false, message: 'Please enter the name of the person you are nominating.' };
  }
  if (input.citation.trim().length < 10) {
    return { ok: false, message: 'Please say a little more about why they deserve this award.' };
  }
  if (!input.deviceId) {
    return { ok: false, message: REASONS.bad_device };
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase.schema('awards').rpc('submit_nomination', {
    p_award_id: input.awardId,
    p_nominee_name: input.nomineeName.trim(),
    p_citation: input.citation.trim(),
    p_device_id: input.deviceId,
    // DEFAULT NULL in SQL, so the generated types make these optional
    // rather than nullable — omit rather than pass null.
    p_nominee_batch_year: input.nomineeBatchYear ?? undefined,
    p_nominee_branch_label: input.nomineeBranchLabel?.trim() || undefined,
    p_nominee_contact: input.nomineeContact?.trim() || undefined,
    p_nominator_name: input.nominatorName?.trim() || undefined,
    p_nominator_batch_year: input.nominatorBatchYear ?? undefined,
    p_nominator_branch_label: input.nominatorBranchLabel?.trim() || undefined,
    p_nominator_contact: input.nominatorContact?.trim() || undefined,
    p_ip_hash: (await ipHash()) ?? undefined,
  });

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.awards.submitNomination',
        message: 'submit_nomination failed',
        code: error.code,
        error: error.message,
      }),
    );
    return {
      ok: false,
      message: 'We could not record that just now. Please try again in a moment.',
    };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (row?.ok) return { ok: true };

  return {
    ok: false,
    message:
      (REASONS as Record<string, string | undefined>)[row?.reason ?? ''] ??
      'We could not record that nomination. Please try again.',
  };
}

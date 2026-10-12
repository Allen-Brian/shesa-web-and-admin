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

/** Two colleges combined by the weights, or the membership alone. */
export type VotingMode = 'weighted' | 'public_only';

export interface AwardsEdition {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly phase: AwardsPhase;
  readonly votingMode: VotingMode;
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
    voting_mode?: string;
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
      votingMode: (raw.edition.voting_mode ?? 'weighted') as VotingMode,
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

/**
 * Names already put forward this cycle, for the form's autocomplete.
 *
 * This exists to stop spelling variants being created, which is worth more
 * than any amount of reconciling them afterwards: "Fru John Che" and "John
 * Doe Fru" are one man, and only a person can tell.
 *
 * It discloses that a name has been nominated somewhere — not for which
 * award, not by whom, and deliberately never how many times. A count here
 * would turn the nomination round into a campaign, with people piling onto
 * whoever is visibly ahead. The database enforces the two-character floor
 * and the cap of eight; this is the second check, not the only one.
 */
export async function suggestNominees(query: string): Promise<readonly string[]> {
  if (query.trim().length < 2) return [];

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('awards')
    .rpc('suggest_nominees', { p_query: query.trim() });

  if (error || !Array.isArray(data)) return [];
  return data.map((r) => r.name);
}

/* ── The ballot ────────────────────────────────────────────────────── */

export type College = 'ex_student' | 'exco';

export interface BallotCandidate {
  readonly id: string;
  readonly fullName: string;
  readonly batchYear: number | null;
  readonly branchLabel: string | null;
  readonly profession: string | null;
  /** Works accomplished in this award's field. The case for voting for them. */
  readonly accomplishments: string | null;
  readonly photoUrl: string | null;
}

export interface BallotAward {
  readonly id: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly candidates: readonly BallotCandidate[];
}

export interface BallotPaper {
  readonly edition: {
    readonly id: string;
    readonly slug: string;
    readonly name: string;
    readonly description: string | null;
    readonly phase: AwardsPhase;
    readonly votingMode: VotingMode;
    readonly votingOpenAt: string | null;
    readonly votingCloseAt: string | null;
  } | null;
  readonly college: College;
  readonly categories: readonly { id: string; name: string }[];
  readonly awards: readonly BallotAward[];
  /** Populated only through the Exco door. */
  readonly excoPosts: readonly string[];
  /** Set when the token in the URL is not the current one. */
  readonly invalidToken: boolean;
  /** Set when an Exco link was used on a ceremony that has no Exco college. */
  readonly publicOnly: boolean;
}

const NO_PAPER: BallotPaper = {
  edition: null,
  college: 'ex_student',
  categories: [],
  awards: [],
  excoPosts: [],
  invalidToken: false,
  publicOnly: false,
};

/**
 * The ballot paper.
 *
 * The token is what makes a ballot an Exco ballot — it is never taken from
 * the client as a claim about who they are, only as the URL they arrived on,
 * and the database is what decides whether it is current.
 */
export async function getBallotPaper(slug?: string, excoToken?: string): Promise<BallotPaper> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.schema('awards').rpc('public_ballot', {
    p_edition_slug: slug ?? undefined,
    p_exco_token: excoToken ?? undefined,
  });

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.awards.getBallotPaper',
        message: 'public_ballot failed',
        error: error.message,
      }),
    );
    return NO_PAPER;
  }

  const raw = data as unknown as {
    edition: {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      phase: string;
      voting_mode?: string;
      voting_open_at: string | null;
      voting_close_at: string | null;
    } | null;
    error?: string;
    college?: College;
    categories?: { id: string; name: string }[];
    awards?: {
      id: string;
      category_id: string | null;
      name: string;
      description: string | null;
      candidates:
        | {
            id: string;
            full_name: string;
            batch_year: number | null;
            branch_label: string | null;
            profession: string | null;
            accomplishments: string | null;
            photo_url: string | null;
          }[]
        | null;
    }[];
    exco_posts?: string[];
  } | null;

  if (raw?.error === 'invalid_token') return { ...NO_PAPER, invalidToken: true };
  if (raw?.error === 'public_only') return { ...NO_PAPER, publicOnly: true };
  if (!raw?.edition) return NO_PAPER;

  return {
    edition: {
      id: raw.edition.id,
      slug: raw.edition.slug,
      name: raw.edition.name,
      description: raw.edition.description,
      phase: raw.edition.phase as AwardsPhase,
      votingMode: (raw.edition.voting_mode ?? 'weighted') as VotingMode,
      votingOpenAt: raw.edition.voting_open_at,
      votingCloseAt: raw.edition.voting_close_at,
    },
    college: raw.college ?? 'ex_student',
    categories: raw.categories ?? [],
    awards: (raw.awards ?? []).map((a) => ({
      id: a.id,
      categoryId: a.category_id,
      name: a.name,
      description: a.description,
      candidates: (a.candidates ?? []).map((c) => ({
        id: c.id,
        fullName: c.full_name,
        batchYear: c.batch_year,
        branchLabel: c.branch_label,
        profession: c.profession,
        accomplishments: c.accomplishments,
        photoUrl: c.photo_url,
      })),
    })),
    excoPosts: raw.exco_posts ?? [],
    invalidToken: false,
    publicOnly: false,
  };
}

export interface BallotInput {
  readonly editionSlug: string;
  readonly deviceId: string;
  /** One candidate per award; awards the voter skipped are simply absent. */
  readonly choices: readonly { awardId: string; candidateId: string }[];
  readonly batchYear?: number | null;
  readonly branchLabel?: string | null;
  readonly excoToken?: string | null;
  readonly excoPost?: string | null;
  readonly excoName?: string | null;
}

const BALLOT_REASONS = {
  unknown_edition: 'This ballot no longer exists.',
  invalid_token: 'That voting link is no longer valid. Ask the secretariat for the current one.',
  public_only:
    'This ceremony is decided by the membership alone — there is no separate Executive Committee ballot. Use the public voting link.',
  not_open_yet: 'Voting has not opened yet.',
  closed: 'Voting has closed. Thank you.',
  bad_device:
    'Your browser is blocking the storage we use to keep one vote per person. Try again outside private browsing.',
  exco_identity_required: 'Please choose your post and enter your name.',
  bad_batch_year: 'Please give a batch year between 1953 and 2026.',
  empty_ballot: 'Please choose at least one candidate before submitting.',
  already_voted: 'A vote has already been cast from this device.',
  throttled: 'Too many ballots from this connection. Please try again later.',
} as const satisfies Record<string, string>;

/** Cast one ballot. */
export async function castBallot(input: BallotInput): Promise<NominationResult> {
  if (!input.deviceId) return { ok: false, message: BALLOT_REASONS.bad_device };
  if (input.choices.length === 0) return { ok: false, message: BALLOT_REASONS.empty_ballot };

  const supabase = await getServerClient();
  const { data, error } = await supabase.schema('awards').rpc('cast_ballot', {
    p_edition_slug: input.editionSlug,
    p_device_id: input.deviceId,
    p_choices: input.choices.map((c) => ({
      award_id: c.awardId,
      candidate_id: c.candidateId,
    })),
    p_batch_year: input.batchYear ?? undefined,
    p_branch_label: input.branchLabel?.trim() || undefined,
    p_exco_token: input.excoToken || undefined,
    p_exco_post: input.excoPost?.trim() || undefined,
    p_exco_name: input.excoName?.trim() || undefined,
    p_ip_hash: (await ipHash()) ?? undefined,
  });

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.awards.castBallot',
        message: 'cast_ballot failed',
        code: error.code,
        error: error.message,
      }),
    );
    return { ok: false, message: 'We could not record your vote. Please try again in a moment.' };
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (row?.ok) return { ok: true };

  return {
    ok: false,
    message:
      (BALLOT_REASONS as Record<string, string | undefined>)[row?.reason ?? ''] ??
      'We could not record your vote. Please try again.',
  };
}

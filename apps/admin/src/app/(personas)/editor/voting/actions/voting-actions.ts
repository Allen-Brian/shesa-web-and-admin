'use server';

import { revalidatePath } from 'next/cache';

import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult } from '../voting-types';

/**
 * Writes for the editor's Voting surface.
 *
 * All plain table writes. RLS on every `awards` table already requires
 * `cms.edit`, so there is nothing here for a definer RPC to add except a
 * second place for the permission rule to drift out of step with the first.
 */

const BASE = '/editor/voting';

function refresh() {
  revalidatePath(BASE);
  revalidatePath(`${BASE}/nominations`);
  revalidatePath(`${BASE}/candidates`);
  revalidatePath(`${BASE}/ballots`);
  revalidatePath(`${BASE}/results`);
  // The public pages read the same structure through their own RPCs.
  revalidatePath('/awards');
}

function fail(message: string): ActionResult {
  return { ok: false, message };
}

/* ── Nomination review ─────────────────────────────────────────────── */

export async function reviewNomination(
  id: string,
  status: 'approved' | 'rejected' | 'pending',
  note?: string,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase
    .schema('awards')
    .from('nominations')
    .update({
      status,
      review_note: note?.trim() || null,
      // Back to pending means un-reviewed, so the reviewer's name comes off
      // too — otherwise the row claims a decision nobody currently holds.
      reviewed_by: status === 'pending' ? null : (auth.user?.id ?? null),
      reviewed_at: status === 'pending' ? null : new Date().toISOString(),
    } as never)
    .eq('id', id);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/** Approve or reject several at once — the review screen's bulk action. */
export async function reviewNominations(
  ids: readonly string[],
  status: 'approved' | 'rejected',
): Promise<ActionResult> {
  if (ids.length === 0) return fail('Nothing selected.');

  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase
    .schema('awards')
    .from('nominations')
    .update({
      status,
      reviewed_by: auth.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    } as never)
    .in('id', ids);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/**
 * Put a nomination on the ballot.
 *
 * The citation becomes the candidate's description, because it is already
 * the best sentence anyone has written about why this person deserves the
 * award — and it was written by a member rather than by the secretariat.
 *
 * Approving is implied: a name on the ballot that reads "pending" on the
 * review screen would be a contradiction the next reviewer has to resolve.
 */
export async function promoteNomination(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: nom, error: readErr } = await supabase
    .schema('awards')
    .from('nominations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (readErr) return fail(readErr.message);
  if (!nom) return fail('That nomination no longer exists.');
  if (nom.candidate_id) return fail('That nomination is already on the ballot.');

  const { data: candidate, error: insErr } = await supabase
    .schema('awards')
    .from('candidates')
    .insert({
      award_id: nom.award_id,
      nomination_id: nom.id,
      full_name: nom.nominee_name,
      batch_year: nom.nominee_batch_year,
      branch_label: nom.nominee_branch_label,
      description: nom.citation,
      created_by: auth.user?.id ?? null,
    } as never)
    .select('id')
    .single();

  if (insErr) {
    // The unique index on (award_id, lower(full_name)) — somebody else was
    // already promoted under this name, which is a fact, not a failure.
    if (insErr.code === '23505') {
      return fail('Someone with that name is already a candidate for this award.');
    }
    return fail(insErr.message);
  }

  const { error: linkErr } = await supabase
    .schema('awards')
    .from('nominations')
    .update({
      candidate_id: candidate.id,
      status: 'approved',
      reviewed_by: auth.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    } as never)
    .eq('id', id);

  if (linkErr) return fail(linkErr.message);
  refresh();
  return { ok: true };
}

/* ── Candidates ────────────────────────────────────────────────────── */

export interface CandidateInput {
  readonly awardId: string;
  readonly fullName: string;
  readonly batchYear: number | null;
  readonly branchLabel: string | null;
  readonly description: string | null;
  readonly photoUrl: string | null;
  readonly sortOrder: number;
  readonly status: 'active' | 'withdrawn';
}

function candidateBody(input: CandidateInput) {
  return {
    award_id: input.awardId,
    full_name: input.fullName.trim(),
    batch_year: input.batchYear,
    branch_label: input.branchLabel?.trim() || null,
    description: input.description?.trim() || null,
    photo_url: input.photoUrl?.trim() || null,
    sort_order: input.sortOrder,
    status: input.status,
  };
}

export async function createCandidate(input: CandidateInput): Promise<ActionResult> {
  if (input.fullName.trim().length < 2) return fail('A candidate needs a name.');

  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase
    .schema('awards')
    .from('candidates')
    .insert({ ...candidateBody(input), created_by: auth.user?.id ?? null } as never);

  if (error) {
    if (error.code === '23505') {
      return fail('Someone with that name is already a candidate for this award.');
    }
    return fail(error.message);
  }
  refresh();
  return { ok: true };
}

export async function updateCandidate(id: string, input: CandidateInput): Promise<ActionResult> {
  if (input.fullName.trim().length < 2) return fail('A candidate needs a name.');

  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('awards')
    .from('candidates')
    .update(candidateBody(input) as never)
    .eq('id', id);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/**
 * Remove a candidate from the ballot.
 *
 * Deleting cascades to `ballot_votes`, which silently rewrites votes already
 * cast — so once voting has opened the answer is `withdrawn`, which takes
 * them off the paper and leaves the record of what people chose intact. The
 * caller passes `hasVotes` because it already knows.
 */
export async function removeCandidate(id: string, hasVotes: boolean): Promise<ActionResult> {
  const supabase = await getServerClient();

  if (hasVotes) {
    const { error } = await supabase
      .schema('awards')
      .from('candidates')
      .update({ status: 'withdrawn' } as never)
      .eq('id', id);
    if (error) return fail(error.message);
    refresh();
    return { ok: true };
  }

  const { error } = await supabase.schema('awards').from('candidates').delete().eq('id', id);
  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/* ── Awards and categories ─────────────────────────────────────────── */

export interface AwardInput {
  readonly editionId: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly status: 'active' | 'hidden';
}

export async function saveAward(id: string | null, input: AwardInput): Promise<ActionResult> {
  if (input.name.trim().length < 2) return fail('An award needs a name.');

  const supabase = await getServerClient();
  const body = {
    edition_id: input.editionId,
    category_id: input.categoryId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    sort_order: input.sortOrder,
    status: input.status,
  };

  const { error } = id
    ? await supabase
        .schema('awards')
        .from('awards')
        .update(body as never)
        .eq('id', id)
    : await supabase
        .schema('awards')
        .from('awards')
        .insert(body as never);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

export async function saveCategory(
  id: string | null,
  editionId: string,
  name: string,
  description: string | null,
  sortOrder: number,
): Promise<ActionResult> {
  if (name.trim().length < 2) return fail('A category needs a name.');

  const supabase = await getServerClient();
  const body = {
    edition_id: editionId,
    name: name.trim(),
    description: description?.trim() || null,
    sort_order: sortOrder,
  };

  const { error } = id
    ? await supabase
        .schema('awards')
        .from('categories')
        .update(body as never)
        .eq('id', id)
    : await supabase
        .schema('awards')
        .from('categories')
        .insert(body as never);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/* ── Ballots ───────────────────────────────────────────────────────── */

/**
 * Strike a ballot from the tally, or restore it.
 *
 * Never a delete. A voided ballot stays on the register with the reason
 * attached, because the question that gets asked after a close result is not
 * "what is the tally" but "what did you take out of it".
 */
export async function setBallotVoid(
  id: string,
  voided: boolean,
  reason?: string,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const { error } = await supabase
    .schema('awards')
    .from('ballots')
    .update(
      voided
        ? {
            voided_at: new Date().toISOString(),
            voided_by: auth.user?.id ?? null,
            void_reason: reason?.trim() || 'Voided by the secretariat',
          }
        : { voided_at: null, voided_by: null, void_reason: null },
    )
    .eq('id', id);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/* ── The cycle itself ──────────────────────────────────────────────── */

export interface EditionInput {
  readonly name: string;
  readonly description: string | null;
  readonly nominationsOpenAt: string | null;
  readonly nominationsCloseAt: string | null;
  readonly votingOpenAt: string | null;
  readonly votingCloseAt: string | null;
}

/**
 * The windows and the wording.
 *
 * Deliberately cannot touch the weights or the weighting method. The
 * briefing forbids altering them without written authorisation from SHESA,
 * and a form field is not a place where that authorisation can be recorded
 * — changing them is a migration, which leaves a commit with a name on it.
 */
export async function updateEdition(id: string, input: EditionInput): Promise<ActionResult> {
  if (input.name.trim().length < 2) return fail('The cycle needs a name.');

  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('awards')
    .from('editions')
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      nominations_open_at: input.nominationsOpenAt,
      nominations_close_at: input.nominationsCloseAt,
      voting_open_at: input.votingOpenAt,
      voting_close_at: input.votingCloseAt,
    } as never)
    .eq('id', id);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/**
 * Issue a new Exco link, invalidating every copy of the old one.
 *
 * The answer to a leak. Ballots already cast through the old link keep their
 * college — they were valid when they were cast, and re-colouring them would
 * disenfranchise the Exco members who used it properly.
 */
export async function regenerateExcoToken(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');

  const { error } = await supabase
    .schema('awards')
    .from('editions')
    .update({ exco_token: token } as never)
    .eq('id', id);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/** Exco posts, for the settings screen. */
export async function saveExcoPost(
  editionId: string,
  label: string,
  sortOrder: number,
): Promise<ActionResult> {
  if (label.trim().length < 2) return fail('A post needs a name.');

  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('awards')
    .from('exco_posts')
    .insert({ edition_id: editionId, label: label.trim(), sort_order: sortOrder } as never);

  if (error) {
    if (error.code === '23505') return fail('That post is already on the list.');
    return fail(error.message);
  }
  refresh();
  return { ok: true };
}

export async function deleteExcoPost(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('awards').from('exco_posts').delete().eq('id', id);
  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

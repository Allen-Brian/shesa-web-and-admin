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

/**
 * Every Voting screen, plus the public pages that read the same structure.
 *
 * `layout` rather than a list of paths: the ceremony routes are dynamic
 * (`/editor/voting/[edition]/awards/[award]`) and enumerating them here
 * would mean this function needed updating every time a route was added.
 */
function refresh() {
  revalidatePath(BASE, 'layout');
  revalidatePath('/awards', 'layout');
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

/* ── Aggregation: nominations into nominees ────────────────────────── */

/**
 * The Aggregate button.
 *
 * Sweeps every not-yet-aggregated nomination for one award into a bucket
 * keyed on its normalised name. Exact matches only — this half of the job is
 * not a judgement, it is the same string, so it can run unattended and cannot
 * be wrong. What it leaves is one bucket per spelling, which is what the
 * merge suggestions then propose folding together.
 */
export async function aggregateAward(
  awardId: string,
): Promise<ActionResult & { created?: number; assigned?: number }> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('awards')
    .rpc('aggregate_nominations', { p_award_id: awardId });

  if (error) return fail(error.message);
  const row = Array.isArray(data) ? data[0] : null;
  refresh();
  return {
    ok: true,
    created: Number(row?.buckets_created ?? 0),
    assigned: Number(row?.nominations_assigned ?? 0),
  };
}

/**
 * Fold one bucket into another.
 *
 * Only ever called from a button a person pressed. The suggestion engine
 * proposes; fusing two real people who share a surname is the one failure
 * this must not have, so nothing merges on its own.
 */
export async function mergeNominees(keepId: string, absorbId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('awards')
    .rpc('merge_nominees', { p_keep: keepId, p_absorb: absorbId });

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/** Rename a bucket. The first spelling to arrive is not always the right one. */
export async function renameNominee(id: string, displayName: string): Promise<ActionResult> {
  if (displayName.trim().length < 2) return fail('A nominee needs a name.');

  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('awards')
    .from('nominees')
    .update({ display_name: displayName.trim() } as never)
    .eq('id', id);

  if (error) {
    if (error.code === '23505')
      return fail('Another nominee for this award already has that name.');
    return fail(error.message);
  }
  refresh();
  return { ok: true };
}

/**
 * Move one nomination into a bucket, or out of every bucket.
 *
 * The manual half of aggregation, and the undo for a merge the machine got
 * wrong — a nomination pulled out with `null` lands back in the idle pile
 * where it can be assigned somewhere else.
 */
export async function assignNomination(
  nominationId: string,
  nomineeId: string | null,
): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('awards')
    .from('nominations')
    .update({ nominee_id: nomineeId } as never)
    .eq('id', nominationId);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/** Start a new bucket by hand, for a spelling nobody has used yet. */
export async function createNominee(awardId: string, displayName: string): Promise<ActionResult> {
  if (displayName.trim().length < 2) return fail('A nominee needs a name.');

  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('awards')
    .from('nominees')
    .insert({ award_id: awardId, display_name: displayName.trim() } as never);

  if (error) {
    if (error.code === '23505') return fail('That name is already a nominee for this award.');
    return fail(error.message);
  }
  refresh();
  return { ok: true };
}

/** Dissolve a bucket. Its nominations return to the idle pile, not the bin. */
export async function deleteNominee(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('awards').from('nominees').delete().eq('id', id);
  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

export interface CandidateDraft {
  readonly awardId: string;
  readonly nomineeId: string;
  readonly fullName: string;
  readonly batchYear: number | null;
  readonly branchLabel: string | null;
  /** Every citation written about this person, for the editor to draw on. */
  readonly citations: readonly string[];
  readonly contacts: readonly string[];
}

/**
 * What the Executive Committee starts from when putting a nominee forward.
 *
 * This deliberately does NOT create the candidate. The briefing wants
 * accurate data on the ballot — profession, works accomplished, a photograph
 * — and none of that is in a nomination. So promoting opens a form seeded
 * with what the members supplied, and a person fills in the rest.
 *
 * Batch and branch are taken by majority across the nominations rather than
 * from the first one: if four people say 1998 and one says 1989, the four are
 * the better guess, and it is a guess the editor can still overrule.
 */
export async function candidateDraft(nomineeId: string): Promise<CandidateDraft | null> {
  const supabase = await getServerClient();

  const { data: bucket } = await supabase
    .schema('awards')
    .from('nominees')
    .select('id, award_id, display_name')
    .eq('id', nomineeId)
    .maybeSingle();

  if (!bucket) return null;

  const { data: noms } = await supabase
    .schema('awards')
    .from('nominations')
    .select('citation, nominee_batch_year, nominee_branch_label, nominee_contact, created_at')
    .eq('nominee_id', nomineeId)
    .order('created_at');

  const rows = noms ?? [];

  const commonest = <T>(values: readonly (T | null)[]): T | null => {
    const tally = new Map<T, number>();
    for (const v of values) {
      if (v === null || v === undefined || v === ('' as unknown as T)) continue;
      tally.set(v, (tally.get(v) ?? 0) + 1);
    }
    let best: T | null = null;
    let bestN = 0;
    for (const [v, n] of tally) {
      if (n > bestN) {
        best = v;
        bestN = n;
      }
    }
    return best;
  };

  return {
    awardId: bucket.award_id,
    nomineeId: bucket.id,
    fullName: bucket.display_name,
    batchYear: commonest(rows.map((r) => r.nominee_batch_year)),
    branchLabel: commonest(rows.map((r) => r.nominee_branch_label)),
    citations: rows.map((r) => r.citation),
    contacts: [...new Set(rows.map((r) => r.nominee_contact).filter((c): c is string => !!c))],
  };
}

/* ── Candidates ────────────────────────────────────────────────────── */

/**
 * What the Executive Committee publishes about a candidate.
 *
 * A nomination is what a member typed on their phone in a hurry. A candidacy
 * is what SHESA puts on a ballot, so the secretariat supplies it properly —
 * name, batch, branch, profession, what the person has actually done in the
 * field the award is for, and a photograph.
 */
export interface CandidateInput {
  readonly awardId: string;
  readonly nomineeId?: string | null;
  readonly fullName: string;
  readonly batchYear: number | null;
  readonly branchLabel: string | null;
  readonly profession: string | null;
  readonly accomplishments: string | null;
  readonly photoUrl: string | null;
  readonly sortOrder: number;
  readonly status: 'active' | 'withdrawn';
}

function candidateBody(input: CandidateInput) {
  return {
    award_id: input.awardId,
    nominee_id: input.nomineeId ?? null,
    full_name: input.fullName.trim(),
    batch_year: input.batchYear,
    branch_label: input.branchLabel?.trim() || null,
    profession: input.profession?.trim() || null,
    accomplishments: input.accomplishments?.trim() || null,
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

/* ── Ceremonies ────────────────────────────────────────────────────── */

export interface CeremonyInput {
  readonly name: string;
  readonly description: string | null;
  readonly nominationsOpenAt: string | null;
  readonly nominationsCloseAt: string | null;
  readonly votingOpenAt: string | null;
  readonly votingCloseAt: string | null;
}

/**
 * A URL-safe slug from the ceremony's name.
 *
 * It becomes the edition's public identity and the segment in every editor
 * URL, so it is derived once at creation and never re-derived: renaming a
 * ceremony afterwards must not break a link someone has bookmarked.
 */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'awards'
  );
}

/**
 * Start a new awards ceremony.
 *
 * Weights are not asked for. The 60/40 split is the approved default and
 * changing it needs written authorisation from SHESA — a field on a creation
 * form is not somewhere that authorisation can be recorded.
 */
export async function createCeremony(
  input: CeremonyInput,
): Promise<ActionResult & { slug?: string }> {
  if (input.name.trim().length < 2) return fail('The ceremony needs a name.');

  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const base = slugify(input.name);

  // A second ceremony in the same year is a real thing, so a clash appends a
  // counter rather than refusing the name the user typed.
  const { data: taken } = await supabase
    .schema('awards')
    .from('editions')
    .select('slug')
    .like('slug', `${base}%`);

  const used = new Set((taken ?? []).map((t) => t.slug));
  let slug = base;
  for (let i = 2; used.has(slug); i += 1) slug = `${base}-${i}`;

  const { error } = await supabase
    .schema('awards')
    .from('editions')
    .insert({
      slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      nominations_open_at: input.nominationsOpenAt,
      nominations_close_at: input.nominationsCloseAt,
      voting_open_at: input.votingOpenAt,
      voting_close_at: input.votingCloseAt,
      created_by: auth.user?.id ?? null,
    } as never);

  if (error) return fail(error.message);
  refresh();
  return { ok: true, slug };
}

/**
 * Delete a ceremony and everything under it.
 *
 * Cascades through categories, awards, nominations, nominees, candidates and
 * ballots. Refused outright once anyone has voted: a cast ballot is a record
 * of what a member did, and no button in a CMS should be able to erase it.
 */
export async function deleteCeremony(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();

  const { count } = await supabase
    .schema('awards')
    .from('ballots')
    .select('id', { count: 'exact', head: true })
    .eq('edition_id', id);

  if ((count ?? 0) > 0) {
    return fail(
      `This ceremony already holds ${count} cast ballot(s) and cannot be deleted. Ask an engineer if it truly needs removing.`,
    );
  }

  const { error } = await supabase.schema('awards').from('editions').delete().eq('id', id);
  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/** Remove an award. Refused once anyone has been nominated for it. */
export async function deleteAward(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();

  const { count } = await supabase
    .schema('awards')
    .from('nominations')
    .select('id', { count: 'exact', head: true })
    .eq('award_id', id);

  if ((count ?? 0) > 0) {
    return fail(
      `${count} nomination(s) have been made for this award. Hide it instead — deleting would take their citations with it.`,
    );
  }

  const { error } = await supabase.schema('awards').from('awards').delete().eq('id', id);
  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/** Remove a category. Its awards survive and become standalone. */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.schema('awards').from('categories').delete().eq('id', id);
  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

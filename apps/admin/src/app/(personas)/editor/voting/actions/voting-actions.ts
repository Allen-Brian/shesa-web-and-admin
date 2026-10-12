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

/* ── Nominations ───────────────────────────────────────────────────── */

/**
 * Delete nominations outright.
 *
 * There is no approve/reject state any more: a nomination is a nomination.
 * The only judgement left is whether a row is real, and the answer to a
 * fake one is to remove it rather than to file it under "rejected" and have
 * every later screen filter around it.
 */
export async function deleteNominations(ids: readonly string[]): Promise<ActionResult> {
  if (ids.length === 0) return fail('Nothing selected.');

  const supabase = await getServerClient();
  const { error } = await supabase.schema('awards').from('nominations').delete().in('id', ids);

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

/* ── Which ceremony is live ────────────────────────────────────────── */

/**
 * Make one ceremony the live one, or stand them all down.
 *
 * The public site shows whichever is active and nothing otherwise, so this
 * is the switch that puts a nomination form in front of the membership.
 *
 * One RPC rather than two writes: a partial unique index enforces "at most
 * one active", which means clearing the old row and setting the new one has
 * to happen inside a single UPDATE or the intermediate state collides with
 * itself.
 */
export async function setActiveCeremony(id: string | null): Promise<ActionResult> {
  const supabase = await getServerClient();

  const { error } = id
    ? await supabase.schema('awards').rpc('set_active_edition', { p_edition_id: id })
    : await supabase.schema('awards').rpc('clear_active_edition');

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/* ── Weighting ─────────────────────────────────────────────────────── */

export type VotingMode = 'weighted' | 'public_only';

export interface WeightingInput {
  readonly mode: VotingMode;
  /** Percentages, 0–100. Only read when the mode is `weighted`. */
  readonly exStudentPercent: number;
  readonly excoPercent: number;
  readonly weightingMethod: 'raw_weighted' | 'college_share';
}

/**
 * How this ceremony counts votes.
 *
 * Stamped with who changed it and when. `awards.results` computes the tally
 * live from these columns, so altering them after ballots are cast changes a
 * result that has already been arrived at — the screen warns about that, and
 * this records it either way, because a published result has to be
 * explainable afterwards.
 *
 * `public_only` forces 100/0. The database also checks it: both weights are
 * read by the tally and a mismatch would produce a figure nobody could
 * account for.
 */
export async function updateWeighting(id: string, input: WeightingInput): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();

  let exStudent = 1;
  let exco = 0;

  if (input.mode === 'weighted') {
    const total = input.exStudentPercent + input.excoPercent;
    if (total <= 0) return fail('The two weights cannot both be zero.');
    if (Math.abs(total - 100) > 0.01) {
      return fail(`The weights must add up to 100% — they currently total ${total}%.`);
    }
    if (input.exStudentPercent < 0 || input.excoPercent < 0) {
      return fail('A weight cannot be negative.');
    }
    // Stored as numeric(4,3): three decimals is 0.1% of resolution, which is
    // finer than any split SHESA is going to approve.
    exStudent = Math.round(input.exStudentPercent * 10) / 1000;
    exco = Math.round(input.excoPercent * 10) / 1000;
  }

  const { error } = await supabase
    .schema('awards')
    .from('editions')
    .update({
      voting_mode: input.mode,
      ex_student_weight: exStudent,
      exco_weight: exco,
      weighting_method: input.weightingMethod,
      weights_changed_at: new Date().toISOString(),
      weights_changed_by: auth.user?.id ?? null,
    } as never)
    .eq('id', id);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/**
 * Put several nominees on the ballot at once.
 *
 * The straight path: pick the people who should be voted on and forward
 * them. Each candidate is seeded from what the members actually wrote —
 * name, the commonest batch and branch across their nominations, and their
 * citations as a first draft of the accomplishments — so nothing has to be
 * retyped before the ballot exists.
 *
 * It is a draft, not a publication. The Ballot tab marks every candidate
 * still missing a profession, a photograph or a written paragraph, because
 * the briefing asks the Exco for accurate data and five hurried sentences
 * concatenated is not that.
 */
export async function promoteNominees(
  ids: readonly string[],
): Promise<ActionResult & { added?: number; skipped?: number }> {
  if (ids.length === 0) return fail('Nothing selected.');

  const supabase = await getServerClient();
  const { data: auth } = await supabase.auth.getUser();

  const { data: buckets, error: readErr } = await supabase
    .schema('awards')
    .from('nominees')
    .select('id, award_id, display_name')
    .in('id', ids);

  if (readErr) return fail(readErr.message);
  if (!buckets || buckets.length === 0) return fail('Those nominees no longer exist.');

  // Already on the ballot — silently skipped rather than failing the batch,
  // because selecting a row that is already a candidate is a slip, not an
  // instruction to undo anything.
  const { data: existing } = await supabase
    .schema('awards')
    .from('candidates')
    .select('nominee_id')
    .in('nominee_id', ids);

  const taken = new Set((existing ?? []).map((c) => c.nominee_id));
  const todo = buckets.filter((b) => !taken.has(b.id));
  if (todo.length === 0) return { ok: true, added: 0, skipped: buckets.length };

  const { data: noms } = await supabase
    .schema('awards')
    .from('nominations')
    .select('nominee_id, citation, nominee_batch_year, nominee_branch_label, created_at')
    .in(
      'nominee_id',
      todo.map((b) => b.id),
    )
    .order('created_at');

  const byNominee = new Map<string, typeof noms>();
  for (const n of noms ?? []) {
    if (!n.nominee_id) continue;
    const list = byNominee.get(n.nominee_id);
    if (list) list.push(n);
    else byNominee.set(n.nominee_id, [n]);
  }

  /** The value most nominations agree on — four saying 1998 beats one saying 1989. */
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

  const rows = todo.map((b) => {
    const mine = byNominee.get(b.id) ?? [];
    return {
      award_id: b.award_id,
      nominee_id: b.id,
      full_name: b.display_name,
      batch_year: commonest((mine ?? []).map((n) => n.nominee_batch_year)),
      branch_label: commonest((mine ?? []).map((n) => n.nominee_branch_label)),
      accomplishments: (mine ?? []).map((n) => n.citation).join('\n\n') || null,
      created_by: auth.user?.id ?? null,
    };
  });

  const { error } = await supabase
    .schema('awards')
    .from('candidates')
    .insert(rows as never);
  if (error) {
    if (error.code === '23505') {
      return fail('Someone with that name is already a candidate for this award.');
    }
    return fail(error.message);
  }

  refresh();
  return { ok: true, added: rows.length, skipped: buckets.length - rows.length };
}

/** Take people off the ballot, one row or many. */
export async function removeCandidates(
  ids: readonly string[],
  afterVotingOpened: boolean,
): Promise<ActionResult> {
  if (ids.length === 0) return fail('Nothing selected.');

  const supabase = await getServerClient();

  // Deleting cascades into ballot_votes and would silently rewrite votes
  // already cast, so once voting is open the answer is a withdrawal.
  const { error } = afterVotingOpened
    ? await supabase
        .schema('awards')
        .from('candidates')
        .update({ status: 'withdrawn' } as never)
        .in('id', ids)
    : await supabase.schema('awards').from('candidates').delete().in('id', ids);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/** Hide or reveal several awards at once. */
export async function setAwardsStatus(
  ids: readonly string[],
  status: 'active' | 'hidden',
): Promise<ActionResult> {
  if (ids.length === 0) return fail('Nothing selected.');

  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('awards')
    .from('awards')
    .update({ status } as never)
    .in('id', ids);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/** Delete awards, one or many. Each is refused if it holds nominations. */
export async function deleteAwards(
  ids: readonly string[],
): Promise<ActionResult & { kept?: number }> {
  if (ids.length === 0) return fail('Nothing selected.');

  const supabase = await getServerClient();

  const { data: noms } = await supabase
    .schema('awards')
    .from('nominations')
    .select('award_id')
    .in('award_id', ids);

  const held = new Set((noms ?? []).map((n) => n.award_id));
  const deletable = ids.filter((id) => !held.has(id));

  if (deletable.length === 0) {
    return fail(
      'Every award selected has nominations against it. Hide them instead — deleting would take the citations people wrote with them.',
    );
  }

  const { error } = await supabase.schema('awards').from('awards').delete().in('id', deletable);
  if (error) return fail(error.message);

  refresh();
  return { ok: true, kept: ids.length - deletable.length };
}

/**
 * Move several nominations under one person, or out of every group.
 *
 * The manual half of grouping. The automatic pass only ever matches exact
 * spellings, so anything a member typed differently — a reordered name, a
 * dropped middle name, a typo — lands here and is placed by hand.
 *
 * `null` returns them to the ungrouped pile, which is also how a bad merge
 * is undone.
 */
export async function assignNominations(
  ids: readonly string[],
  nomineeId: string | null,
): Promise<ActionResult> {
  if (ids.length === 0) return fail('Nothing selected.');

  const supabase = await getServerClient();
  const { error } = await supabase
    .schema('awards')
    .from('nominations')
    .update({ nominee_id: nomineeId } as never)
    .in('id', ids);

  if (error) return fail(error.message);
  refresh();
  return { ok: true };
}

/**
 * Start a new person from a nomination's own spelling and place it there.
 *
 * The common case when a name arrives that nobody has used before: the
 * alternative is typing the name a second time into the "add by hand" box
 * and then finding the nomination again to attach it.
 */
export async function groupUnderNewNominee(
  awardId: string,
  displayName: string,
  nominationIds: readonly string[],
): Promise<ActionResult> {
  if (displayName.trim().length < 2) return fail('That name is too short to group under.');

  const supabase = await getServerClient();

  // Reuse an existing person with the same normalised name rather than
  // colliding with the unique index — the caller meant "put it with them".
  const { data: existing } = await supabase
    .schema('awards')
    .from('nominees')
    .select('id, display_name')
    .eq('award_id', awardId);

  const key = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/ +/g, ' ')
      .trim();

  let nomineeId = (existing ?? []).find((n) => key(n.display_name) === key(displayName))?.id;

  if (!nomineeId) {
    const { data: created, error } = await supabase
      .schema('awards')
      .from('nominees')
      .insert({ award_id: awardId, display_name: displayName.trim() } as never)
      .select('id')
      .single();

    if (error) return fail(error.message);
    nomineeId = created.id;
  }

  return assignNominations(nominationIds, nomineeId);
}

/**
 * Fold several people into one.
 *
 * `awards.merge_nominees` takes a pair, so this walks the list — each
 * absorbed entry's nominations move across and the empty entry goes. Done in
 * sequence rather than in parallel: they all write the same rows, and the
 * order decides which display name survives if two of them clash.
 */
export async function mergeManyNominees(
  keepId: string,
  absorbIds: readonly string[],
): Promise<ActionResult & { moved?: number }> {
  const targets = absorbIds.filter((id) => id !== keepId);
  if (targets.length === 0) return fail('Pick at least two people to merge.');

  const supabase = await getServerClient();
  let moved = 0;

  for (const absorb of targets) {
    const { data, error } = await supabase
      .schema('awards')
      .rpc('merge_nominees', { p_keep: keepId, p_absorb: absorb });
    if (error) return fail(error.message);
    moved += Number(data ?? 0);
  }

  refresh();
  return { ok: true, moved };
}

import { getServerClient } from '@/lib/supabase-server';

import type {
  AwardRow,
  AwardsPhase,
  BallotRow,
  CandidateRow,
  CategoryRow,
  EditionRow,
  MergeSuggestion,
  NominationRow,
  NomineeRow,
  ResultRow,
  Turnout,
} from './voting-types';

/**
 * Reads for the editor's Voting surface.
 *
 * Straight table reads rather than the public RPCs: an editor holding
 * `cms.edit` is admitted by RLS on every `awards` table, and the definer
 * functions deliberately withhold what these screens exist to show —
 * hidden awards, pending nominations, the Exco token, the tally.
 *
 * Everything below is scoped to one ceremony or one award. A cycle is a
 * self-contained thing with its own dates, awards and ballot, and a screen
 * mixing two of them would be showing counts nobody asked for.
 */

/** Mirrors `awards.phase()`, which the editor's table reads bypass. */
function phaseOf(e: {
  nominations_open_at: string | null;
  nominations_close_at: string | null;
  voting_open_at: string | null;
  voting_close_at: string | null;
}): AwardsPhase {
  const now = Date.now();
  const at = (s: string | null) => (s ? new Date(s).getTime() : null);
  const vc = at(e.voting_close_at);
  const vo = at(e.voting_open_at);
  const nc = at(e.nominations_close_at);
  const no = at(e.nominations_open_at);

  if (vc !== null && now > vc) return 'closed';
  if (vo !== null && now >= vo) return 'voting';
  if (nc !== null && now > nc) return 'review';
  if (no !== null && now >= no) return 'nominating';
  return 'upcoming';
}

interface RawEdition {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  nominations_open_at: string | null;
  nominations_close_at: string | null;
  voting_open_at: string | null;
  voting_close_at: string | null;
  ex_student_weight: number | string;
  exco_weight: number | string;
  weighting_method: string;
  exco_token: string;
  results_published_at: string | null;
  is_active: boolean;
  voting_mode: string;
  weights_changed_at: string | null;
}

function toEdition(raw: RawEdition): EditionRow {
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    phase: phaseOf(raw),
    isActive: raw.is_active,
    votingMode: raw.voting_mode as EditionRow['votingMode'],
    weightsChangedAt: raw.weights_changed_at,
    nominationsOpenAt: raw.nominations_open_at,
    nominationsCloseAt: raw.nominations_close_at,
    votingOpenAt: raw.voting_open_at,
    votingCloseAt: raw.voting_close_at,
    exStudentWeight: Number(raw.ex_student_weight),
    excoWeight: Number(raw.exco_weight),
    weightingMethod: raw.weighting_method,
    excoToken: raw.exco_token,
    resultsPublishedAt: raw.results_published_at,
  };
}

/** Every ceremony, newest first — the sidebar and the index both read this. */
export async function loadEditions(): Promise<readonly EditionRow[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('awards')
    .from('editions')
    .select('*')
    .order('created_at', { ascending: false });

  return (data ?? []).map((e) => toEdition(e as RawEdition));
}

/** One ceremony, by its slug. */
export async function loadEditionBySlug(slug: string): Promise<EditionRow | null> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('awards')
    .from('editions')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  return data ? toEdition(data as RawEdition) : null;
}

export interface EditionTotals {
  readonly nominations: number;
  /** Distinct people named across every award. */
  readonly nominees: number;
  readonly candidates: number;
  readonly emptyAwards: number;
  readonly ballots: number;
}

export interface LoadedCeremony {
  readonly edition: EditionRow;
  readonly categories: readonly CategoryRow[];
  readonly awards: readonly AwardRow[];
  readonly totals: EditionTotals;
}

/**
 * A ceremony and the shape of its awards.
 *
 * The three counts per award are the point of the awards table: which one
 * matters moves as the cycle does — nominations while the form is open,
 * pending while the shortlist is drawn, candidates once it is.
 */
export async function loadCeremony(slug: string): Promise<LoadedCeremony | null> {
  const edition = await loadEditionBySlug(slug);
  if (!edition) return null;

  const supabase = await getServerClient();

  const [cats, awards] = await Promise.all([
    supabase
      .schema('awards')
      .from('categories')
      .select('id, name, description, sort_order')
      .eq('edition_id', edition.id)
      .order('sort_order'),
    supabase
      .schema('awards')
      .from('awards')
      .select('id, category_id, name, description, sort_order, status')
      .eq('edition_id', edition.id)
      .order('sort_order'),
  ]);

  const awardIds = (awards.data ?? []).map((a) => a.id);
  const empty = { data: [] as { award_id: string; status: string }[] };
  const emptyIds = { data: [] as { award_id: string }[] };

  // Counted from two narrow reads filtered to this ceremony's awards. An
  // aggregate view would be a database object to maintain for arithmetic
  // over a few hundred rows.
  const [noms, nominees, cands, ballots] = await Promise.all([
    awardIds.length
      ? supabase
          .schema('awards')
          .from('nominations')
          .select('award_id, status')
          .in('award_id', awardIds)
      : Promise.resolve(empty),
    awardIds.length
      ? supabase.schema('awards').from('nominees').select('award_id').in('award_id', awardIds)
      : Promise.resolve(emptyIds),
    awardIds.length
      ? supabase
          .schema('awards')
          .from('candidates')
          .select('award_id, status')
          .in('award_id', awardIds)
      : Promise.resolve(empty),
    supabase
      .schema('awards')
      .from('ballots')
      .select('id', { count: 'exact', head: true })
      .eq('edition_id', edition.id),
  ]);

  const nomCount = new Map<string, number>();
  for (const n of noms.data ?? []) {
    nomCount.set(n.award_id, (nomCount.get(n.award_id) ?? 0) + 1);
  }

  const nomineeCount = new Map<string, number>();
  for (const b of nominees.data ?? []) {
    nomineeCount.set(b.award_id, (nomineeCount.get(b.award_id) ?? 0) + 1);
  }

  const candCount = new Map<string, number>();
  for (const c of cands.data ?? []) {
    if (c.status !== 'active') continue;
    candCount.set(c.award_id, (candCount.get(c.award_id) ?? 0) + 1);
  }

  const rows: AwardRow[] = (awards.data ?? []).map((a) => ({
    id: a.id,
    categoryId: a.category_id,
    name: a.name,
    description: a.description,
    sortOrder: a.sort_order,
    status: a.status as AwardRow['status'],
    nominationCount: nomCount.get(a.id) ?? 0,
    nomineeCount: nomineeCount.get(a.id) ?? 0,
    candidateCount: candCount.get(a.id) ?? 0,
  }));

  return {
    edition,
    categories: (cats.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      sortOrder: c.sort_order,
    })),
    awards: rows,
    totals: {
      nominations: rows.reduce((n, a) => n + a.nominationCount, 0),
      nominees: rows.reduce((n, a) => n + a.nomineeCount, 0),
      candidates: rows.reduce((n, a) => n + a.candidateCount, 0),
      emptyAwards: rows.filter((a) => a.status === 'active' && a.candidateCount === 0).length,
      ballots: (ballots as { count?: number | null }).count ?? 0,
    },
  };
}

export type EditionSummary = EditionRow & {
  readonly awardCount: number;
  readonly nominationCount: number;
  /** Distinct people named across the ceremony's awards. */
  readonly nomineeCount: number;
  readonly candidateCount: number;
  readonly ballotCount: number;
  /** Awards with nobody shortlisted — these vanish from the public ballot. */
  readonly emptyAwardCount: number;
  /** AG Grid rows are indexed by string key. */
  readonly [key: string]: unknown;
};

/**
 * The ceremony index.
 *
 * Four narrow reads across the whole schema and the arithmetic done here,
 * rather than a query per ceremony. There are a handful of ceremonies and a
 * few hundred nominations; the round trips would cost more than the loop.
 */
export async function loadEditionSummaries(): Promise<readonly EditionSummary[]> {
  const editions = await loadEditions();
  if (editions.length === 0) return [];

  const supabase = await getServerClient();
  const [awards, noms, nominees, cands, ballots] = await Promise.all([
    supabase.schema('awards').from('awards').select('id, edition_id, status'),
    supabase.schema('awards').from('nominations').select('award_id'),
    supabase.schema('awards').from('nominees').select('award_id'),
    supabase.schema('awards').from('candidates').select('award_id, status'),
    supabase.schema('awards').from('ballots').select('edition_id, voided_at'),
  ]);

  const editionOf = new Map<string, string>();
  const awardCount = new Map<string, number>();
  const activeAwards = new Map<string, string[]>();
  for (const a of awards.data ?? []) {
    editionOf.set(a.id, a.edition_id);
    awardCount.set(a.edition_id, (awardCount.get(a.edition_id) ?? 0) + 1);
    if (a.status === 'active') {
      const list = activeAwards.get(a.edition_id);
      if (list) list.push(a.id);
      else activeAwards.set(a.edition_id, [a.id]);
    }
  }

  const nomCount = new Map<string, number>();
  for (const n of noms.data ?? []) {
    const ed = editionOf.get(n.award_id);
    if (!ed) continue;
    nomCount.set(ed, (nomCount.get(ed) ?? 0) + 1);
  }

  const nomineeCount = new Map<string, number>();
  for (const b of nominees.data ?? []) {
    const ed = editionOf.get(b.award_id);
    if (!ed) continue;
    nomineeCount.set(ed, (nomineeCount.get(ed) ?? 0) + 1);
  }

  const candCount = new Map<string, number>();
  const awardsWithCandidates = new Set<string>();
  for (const c of cands.data ?? []) {
    if (c.status !== 'active') continue;
    awardsWithCandidates.add(c.award_id);
    const ed = editionOf.get(c.award_id);
    if (!ed) continue;
    candCount.set(ed, (candCount.get(ed) ?? 0) + 1);
  }

  const ballotCount = new Map<string, number>();
  for (const b of ballots.data ?? []) {
    if (b.voided_at) continue;
    ballotCount.set(b.edition_id, (ballotCount.get(b.edition_id) ?? 0) + 1);
  }

  return editions.map((e) => ({
    ...e,
    awardCount: awardCount.get(e.id) ?? 0,
    nominationCount: nomCount.get(e.id) ?? 0,
    nomineeCount: nomineeCount.get(e.id) ?? 0,
    candidateCount: candCount.get(e.id) ?? 0,
    ballotCount: ballotCount.get(e.id) ?? 0,
    emptyAwardCount: (activeAwards.get(e.id) ?? []).filter((id) => !awardsWithCandidates.has(id))
      .length,
  }));
}

/* ── One award ─────────────────────────────────────────────────────── */

export interface AwardWorkspace {
  readonly edition: EditionRow;
  readonly award: AwardRow;
  readonly categoryName: string | null;
  readonly nominations: readonly NominationRow[];
  readonly nominees: readonly NomineeRow[];
  readonly candidates: readonly CandidateRow[];
  readonly suggestions: readonly MergeSuggestion[];
}

/**
 * Everything about one award, in one place.
 *
 * Scoped to the award rather than the ceremony because that is the unit the
 * work happens in: the question is never "review the nominations", it is
 * "who should be on the ballot for Health".
 */
export async function loadAward(slug: string, awardId: string): Promise<AwardWorkspace | null> {
  const edition = await loadEditionBySlug(slug);
  if (!edition) return null;

  const supabase = await getServerClient();

  const { data: awardRow } = await supabase
    .schema('awards')
    .from('awards')
    .select('id, category_id, name, description, sort_order, status, edition_id')
    .eq('id', awardId)
    .maybeSingle();

  // Guard the pairing, not just existence: an award id from one ceremony
  // must not render under another ceremony's slug.
  if (!awardRow || awardRow.edition_id !== edition.id) return null;

  const [noms, nominees, cands, suggestions, category] = await Promise.all([
    supabase
      .schema('awards')
      .from('nominations')
      .select('*')
      .eq('award_id', awardId)
      .order('created_at', { ascending: false }),
    supabase
      .schema('awards')
      .from('nominees')
      .select('id, award_id, display_name')
      .eq('award_id', awardId),
    supabase
      .schema('awards')
      .from('candidates')
      .select('*')
      .eq('award_id', awardId)
      .order('sort_order'),
    supabase.schema('awards').rpc('merge_suggestions', { p_award_id: awardId }),
    awardRow.category_id
      ? supabase
          .schema('awards')
          .from('categories')
          .select('name')
          .eq('id', awardRow.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const nominationRows = noms.data ?? [];

  // Support count: how many nominations name the same person, compared the
  // way a reader would — case and spacing carry no meaning.
  const key = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
  const support = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const n of nominationRows) {
    support.set(key(n.nominee_name), (support.get(key(n.nominee_name)) ?? 0) + 1);
    if (n.nominee_id) counts.set(n.nominee_id, (counts.get(n.nominee_id) ?? 0) + 1);
  }

  const candidateRows = cands.data ?? [];
  const candidateOf = new Map<string, string>();
  for (const c of candidateRows) {
    if (c.nominee_id) candidateOf.set(c.nominee_id, c.id);
  }

  return {
    edition,
    award: {
      id: awardRow.id,
      categoryId: awardRow.category_id,
      name: awardRow.name,
      description: awardRow.description,
      sortOrder: awardRow.sort_order,
      status: awardRow.status as AwardRow['status'],
      nominationCount: nominationRows.length,
      nomineeCount: (nominees.data ?? []).length,
      candidateCount: candidateRows.filter((c) => c.status === 'active').length,
    },
    categoryName: (category as { data: { name: string } | null }).data?.name ?? null,
    nominations: nominationRows.map((n) => ({
      id: n.id,
      awardId: n.award_id,
      nomineeName: n.nominee_name,
      nomineeBatchYear: n.nominee_batch_year,
      nomineeBranchLabel: n.nominee_branch_label,
      nomineeContact: n.nominee_contact,
      citation: n.citation,
      nominatorName: n.nominator_name,
      nominatorBatchYear: n.nominator_batch_year,
      nominatorBranchLabel: n.nominator_branch_label,
      nominatorContact: n.nominator_contact,
      candidateId: n.candidate_id,
      nomineeId: n.nominee_id,
      createdAt: n.created_at,
      supportCount: support.get(key(n.nominee_name)) ?? 1,
    })),
    nominees: (nominees.data ?? [])
      .map((b) => ({
        id: b.id,
        awardId: b.award_id,
        displayName: b.display_name,
        nominationCount: counts.get(b.id) ?? 0,
        candidateId: candidateOf.get(b.id) ?? null,
      }))
      .sort(
        (a, b) =>
          b.nominationCount - a.nominationCount || a.displayName.localeCompare(b.displayName),
      ),
    candidates: candidateRows.map((c) => ({
      id: c.id,
      awardId: c.award_id,
      nominationId: c.nomination_id,
      nomineeId: c.nominee_id,
      fullName: c.full_name,
      batchYear: c.batch_year,
      branchLabel: c.branch_label,
      profession: c.profession,
      accomplishments: c.accomplishments,
      photoUrl: c.photo_url,
      sortOrder: c.sort_order,
      status: c.status as CandidateRow['status'],
    })),
    suggestions: (Array.isArray(suggestions.data) ? suggestions.data : []).map((r) => ({
      leftId: r.left_id,
      leftName: r.left_name,
      leftCount: Number(r.left_count),
      rightId: r.right_id,
      rightName: r.right_name,
      rightCount: Number(r.right_count),
      overlap: Number(r.overlap),
    })),
  };
}

/* ── Ballots and results ───────────────────────────────────────────── */

/**
 * The ballot register.
 *
 * Exco ballots are the ones a human can actually audit — few enough that a
 * post-and-name pair is checkable against people the secretariat knows.
 */
export async function loadBallots(editionId: string): Promise<readonly BallotRow[]> {
  const supabase = await getServerClient();

  const [ballots, votes] = await Promise.all([
    supabase
      .schema('awards')
      .from('ballots')
      .select('*')
      .eq('edition_id', editionId)
      .order('college')
      .order('submitted_at', { ascending: false }),
    supabase.schema('awards').from('ballot_votes').select('ballot_id'),
  ]);

  if (!ballots.data) return [];

  const choices = new Map<string, number>();
  for (const v of votes.data ?? []) {
    choices.set(v.ballot_id, (choices.get(v.ballot_id) ?? 0) + 1);
  }

  return ballots.data.map((b) => ({
    id: b.id,
    college: b.college as BallotRow['college'],
    voterBatchYear: b.voter_batch_year,
    voterBranchLabel: b.voter_branch_label,
    excoPost: b.exco_post,
    excoName: b.exco_name,
    deviceId: b.device_id,
    ipHash: b.ip_hash,
    submittedAt: b.submitted_at,
    voidedAt: b.voided_at,
    voidReason: b.void_reason,
    choiceCount: choices.get(b.id) ?? 0,
  }));
}

export async function loadResults(
  editionId: string,
): Promise<{ results: readonly ResultRow[]; turnout: Turnout }> {
  const supabase = await getServerClient();

  const [res, tur] = await Promise.all([
    supabase.schema('awards').rpc('results', { p_edition_id: editionId }),
    supabase.schema('awards').rpc('turnout', { p_edition_id: editionId }),
  ]);

  const raw = (tur.data ?? {}) as {
    ex_student?: number;
    exco?: number;
    voided?: number;
    by_day?: { day: string; count: number }[];
    by_decade?: { decade: string; count: number }[];
    by_branch?: { branch: string; count: number }[];
  };

  return {
    results: (res.data ?? []).map((r) => ({
      awardId: r.award_id,
      awardName: r.award_name,
      categoryName: r.category_name,
      candidateId: r.candidate_id,
      candidateName: r.candidate_name,
      exStudentVotes: Number(r.ex_student_votes),
      excoVotes: Number(r.exco_votes),
      score: Number(r.score),
      place: Number(r.place),
    })),
    turnout: {
      exStudent: Number(raw.ex_student ?? 0),
      exco: Number(raw.exco ?? 0),
      voided: Number(raw.voided ?? 0),
      byDay: raw.by_day ?? [],
      byDecade: raw.by_decade ?? [],
      byBranch: raw.by_branch ?? [],
    },
  };
}

/** The Exco post list, for the ceremony's Description tab. */
export async function loadExcoPosts(
  editionId: string,
): Promise<readonly { id: string; label: string; sortOrder: number }[]> {
  const supabase = await getServerClient();
  const { data } = await supabase
    .schema('awards')
    .from('exco_posts')
    .select('id, label, sort_order')
    .eq('edition_id', editionId)
    .order('sort_order');

  return (data ?? []).map((p) => ({ id: p.id, label: p.label, sortOrder: p.sort_order }));
}

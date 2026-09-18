import { getServerClient } from '@/lib/supabase-server';

import type {
  AwardRow,
  AwardsPhase,
  BallotRow,
  CandidateRow,
  CategoryRow,
  EditionRow,
  NominationRow,
  NominationStatus,
  ResultRow,
  Turnout,
} from './voting-types';

/**
 * Reads for the editor's Voting surface.
 *
 * Straight table reads rather than the public RPCs: an editor holding
 * `cms.edit` is admitted by RLS on every `awards` table, and the definer
 * functions deliberately withhold what this screen exists to show —
 * hidden awards, pending nominations, the Exco token, the tally.
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

export async function loadEdition(): Promise<EditionRow | null> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('awards')
    .from('editions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    phase: phaseOf(data),
    nominationsOpenAt: data.nominations_open_at,
    nominationsCloseAt: data.nominations_close_at,
    votingOpenAt: data.voting_open_at,
    votingCloseAt: data.voting_close_at,
    exStudentWeight: Number(data.ex_student_weight),
    excoWeight: Number(data.exco_weight),
    weightingMethod: data.weighting_method,
    excoToken: data.exco_token,
    resultsPublishedAt: data.results_published_at,
  };
}

export interface LoadedVoting {
  readonly edition: EditionRow | null;
  readonly categories: readonly CategoryRow[];
  readonly awards: readonly AwardRow[];
}

/** The overview: the cycle, its structure, and how full each award is. */
export async function loadVoting(): Promise<LoadedVoting> {
  const edition = await loadEdition();
  if (!edition) return { edition: null, categories: [], awards: [] };

  const supabase = await getServerClient();

  const [cats, awards, noms, cands] = await Promise.all([
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
    // Counts are derived in JS from two narrow column reads. The row counts
    // here are in the hundreds, and a per-award aggregate view would be a
    // database object to maintain for an arithmetic problem this small.
    supabase.schema('awards').from('nominations').select('award_id, status'),
    supabase.schema('awards').from('candidates').select('award_id, status'),
  ]);

  const nomCount = new Map<string, number>();
  const pendCount = new Map<string, number>();
  for (const n of noms.data ?? []) {
    nomCount.set(n.award_id, (nomCount.get(n.award_id) ?? 0) + 1);
    if (n.status === 'pending') pendCount.set(n.award_id, (pendCount.get(n.award_id) ?? 0) + 1);
  }

  const candCount = new Map<string, number>();
  for (const c of cands.data ?? []) {
    if (c.status !== 'active') continue;
    candCount.set(c.award_id, (candCount.get(c.award_id) ?? 0) + 1);
  }

  return {
    edition,
    categories: (cats.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      sortOrder: c.sort_order,
    })),
    awards: (awards.data ?? []).map((a) => ({
      id: a.id,
      categoryId: a.category_id,
      name: a.name,
      description: a.description,
      sortOrder: a.sort_order,
      status: a.status as AwardRow['status'],
      nominationCount: nomCount.get(a.id) ?? 0,
      pendingCount: pendCount.get(a.id) ?? 0,
      candidateCount: candCount.get(a.id) ?? 0,
    })),
  };
}

/**
 * Every nomination, with a support count.
 *
 * The count is the point of this screen. Ten people naming the same person
 * for the same award is the single strongest signal the secretariat has, and
 * without it a reviewer reads ten near-identical rows and has to notice the
 * pattern themselves.
 */
export async function loadNominations(): Promise<readonly NominationRow[]> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('awards')
    .from('nominations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const support = new Map<string, number>();
  const key = (awardId: string, name: string) =>
    `${awardId}::${name.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  for (const n of data) {
    const k = key(n.award_id, n.nominee_name);
    support.set(k, (support.get(k) ?? 0) + 1);
  }

  return data.map((n) => ({
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
    status: n.status as NominationStatus,
    reviewNote: n.review_note,
    candidateId: n.candidate_id,
    createdAt: n.created_at,
    supportCount: support.get(key(n.award_id, n.nominee_name)) ?? 1,
  }));
}

export async function loadCandidates(): Promise<readonly CandidateRow[]> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('awards')
    .from('candidates')
    .select('*')
    .order('sort_order');

  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id,
    awardId: c.award_id,
    nominationId: c.nomination_id,
    fullName: c.full_name,
    batchYear: c.batch_year,
    branchLabel: c.branch_label,
    description: c.description,
    photoUrl: c.photo_url,
    sortOrder: c.sort_order,
    status: c.status as CandidateRow['status'],
  }));
}

/**
 * The ballot register.
 *
 * Exco ballots first: they are the ones a human actually reviews, because
 * the post-and-name pair is checkable against a list of people the
 * secretariat knows.
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

/** The Exco post list, for the settings screen. */
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

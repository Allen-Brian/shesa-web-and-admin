/** Shared shapes for the editor's Voting surface. */

export type AwardsPhase = 'upcoming' | 'nominating' | 'review' | 'voting' | 'closed';

/** Two colleges combined by the weights, or the membership alone. */
export type VotingMode = 'weighted' | 'public_only';

export interface EditionRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly phase: AwardsPhase;
  /** The ceremony the public site shows. At most one, enforced in the database. */
  readonly isActive: boolean;
  readonly votingMode: VotingMode;
  readonly weightsChangedAt: string | null;
  readonly nominationsOpenAt: string | null;
  readonly nominationsCloseAt: string | null;
  readonly votingOpenAt: string | null;
  readonly votingCloseAt: string | null;
  readonly exStudentWeight: number;
  readonly excoWeight: number;
  readonly weightingMethod: string;
  /** The secret path segment for the Exco ballot. Never leaves this app. */
  readonly excoToken: string;
  readonly resultsPublishedAt: string | null;
}

export interface CategoryRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
}

export interface AwardRow {
  readonly id: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly status: 'active' | 'hidden';
  readonly nominationCount: number;
  /** Distinct people named, after the spellings have been grouped. */
  readonly nomineeCount: number;
  readonly candidateCount: number;
  /** AG Grid rows are indexed by string key. */
  readonly [key: string]: unknown;
}

export interface NominationRow {
  readonly id: string;
  readonly awardId: string;
  readonly nomineeName: string;
  readonly nomineeBatchYear: number | null;
  readonly nomineeBranchLabel: string | null;
  readonly nomineeContact: string | null;
  readonly citation: string;
  readonly nominatorName: string | null;
  readonly nominatorBatchYear: number | null;
  readonly nominatorBranchLabel: string | null;
  readonly nominatorContact: string | null;
  readonly candidateId: string | null;
  /** The person this nomination has been grouped under. NULL = ungrouped. */
  readonly nomineeId: string | null;
  readonly createdAt: string;
  /** How many nominations name the same person for the same award. */
  readonly supportCount: number;
  readonly [key: string]: unknown;
}

export interface CandidateRow {
  readonly id: string;
  readonly awardId: string;
  readonly nominationId: string | null;
  readonly nomineeId: string | null;
  readonly fullName: string;
  readonly batchYear: number | null;
  readonly branchLabel: string | null;
  readonly profession: string | null;
  /** Works accomplished, relevant to this award. What a voter reads. */
  readonly accomplishments: string | null;
  readonly photoUrl: string | null;
  readonly sortOrder: number;
  readonly status: 'active' | 'withdrawn';
  readonly [key: string]: unknown;
}

/**
 * A bucket: one person, per award, above the nominations naming them.
 *
 * `nominationCount` is computed on every read rather than stored. A stored
 * counter is a second source of truth that goes stale the moment two buckets
 * merge, and a count that is quietly wrong gets believed.
 */
export interface NomineeRow {
  readonly id: string;
  readonly awardId: string;
  readonly displayName: string;
  readonly nominationCount: number;
  /** Set once this person has been put on the ballot. */
  readonly candidateId: string | null;
  readonly [key: string]: unknown;
}

/** Two buckets that might be the same person. A proposal, never an action. */
export interface MergeSuggestion {
  readonly leftId: string;
  readonly leftName: string;
  readonly leftCount: number;
  readonly rightId: string;
  readonly rightName: string;
  readonly rightCount: number;
  readonly overlap: number;
}

export interface BallotRow {
  readonly id: string;
  readonly college: 'ex_student' | 'exco';
  readonly voterBatchYear: number | null;
  readonly voterBranchLabel: string | null;
  readonly excoPost: string | null;
  readonly excoName: string | null;
  readonly deviceId: string;
  readonly ipHash: string | null;
  readonly submittedAt: string;
  readonly voidedAt: string | null;
  readonly voidReason: string | null;
  readonly choiceCount: number;
}

export interface ResultRow {
  readonly awardId: string;
  readonly awardName: string;
  readonly categoryName: string | null;
  readonly candidateId: string;
  readonly candidateName: string;
  readonly exStudentVotes: number;
  readonly excoVotes: number;
  readonly score: number;
  readonly place: number;
}

export interface Turnout {
  readonly exStudent: number;
  readonly exco: number;
  readonly voided: number;
  readonly byDay: readonly { day: string; count: number }[];
  readonly byDecade: readonly { decade: string; count: number }[];
  readonly byBranch: readonly { branch: string; count: number }[];
}

export type ActionResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

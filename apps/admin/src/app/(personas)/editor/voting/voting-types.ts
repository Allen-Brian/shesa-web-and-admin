/** Shared shapes for the editor's Voting surface. */

export type AwardsPhase = 'upcoming' | 'nominating' | 'review' | 'voting' | 'closed';
export type NominationStatus = 'pending' | 'approved' | 'rejected';

export interface EditionRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly phase: AwardsPhase;
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
  readonly pendingCount: number;
  readonly candidateCount: number;
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
  readonly status: NominationStatus;
  readonly reviewNote: string | null;
  readonly candidateId: string | null;
  readonly createdAt: string;
  /** How many other nominations name the same person for the same award. */
  readonly supportCount: number;
}

export interface CandidateRow {
  readonly id: string;
  readonly awardId: string;
  readonly nominationId: string | null;
  readonly fullName: string;
  readonly batchYear: number | null;
  readonly branchLabel: string | null;
  readonly description: string | null;
  readonly photoUrl: string | null;
  readonly sortOrder: number;
  readonly status: 'active' | 'withdrawn';
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

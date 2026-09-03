export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; message: string };

export type ProjectStatus = 'Active' | 'Ongoing' | 'Planning' | 'Fundraising' | 'Completed';

export interface CategoryInput {
  readonly name: string;
  readonly sortOrder: number;
}

export interface Milestone {
  readonly date: string;
  readonly title: string;
  readonly body?: string;
  readonly done: boolean;
}

export interface ImpactStat {
  readonly value: string;
  readonly label: string;
}

/** Payload passed by both the create + edit forms. */
export interface ProjectInput {
  readonly slug: string;
  readonly title: string;
  readonly shortDescription?: string | null;
  readonly descriptionHtml: string;
  readonly bannerUrl?: string | null;
  readonly status: ProjectStatus;
  readonly startedOn?: string | null;
  readonly location?: string | null;
  readonly lead?: string | null;
  readonly isFeatured: boolean;
  /** Fundraising trio — either all set or all null. */
  readonly fundingRaised?: number | null;
  readonly fundingTarget?: number | null;
  readonly fundingCurrency?: string | null;
  readonly milestones: readonly Milestone[];
  readonly impactStats: readonly ImpactStat[];
  /** Full desired set of category-id assignments (replaces existing). */
  readonly categoryIds: readonly string[];
}

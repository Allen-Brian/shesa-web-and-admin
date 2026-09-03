export interface CategoryRow {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

export type ProjectStatus = 'Active' | 'Ongoing' | 'Planning' | 'Fundraising' | 'Completed';

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

export interface ProjectRow {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly shortDescription: string | null;
  readonly descriptionHtml: string;
  readonly bannerUrl: string | null;
  readonly status: ProjectStatus;
  readonly startedOn: string | null;
  readonly location: string | null;
  readonly lead: string | null;
  readonly isFeatured: boolean;
  readonly fundingRaised: number | null;
  readonly fundingTarget: number | null;
  readonly fundingCurrency: string | null;
  readonly milestones: readonly Milestone[];
  readonly impactStats: readonly ImpactStat[];
  readonly categoryIds: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

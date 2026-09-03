/**
 * Public-site project shape. Sourced from `cms.projects` +
 * `cms.project_categories` at read time by the server page. The web
 * components accept these as props, no static data lives here.
 */

export type ProjectStatus = 'Active' | 'Ongoing' | 'Planning' | 'Fundraising' | 'Completed';

export type ProjectMilestone = {
  readonly date: string;
  readonly title: string;
  readonly body?: string;
  readonly done?: boolean;
};

export type ProjectImpact = {
  readonly value: string;
  readonly label: string;
};

export type Project = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /**
   * The finance charge this project raises into, or null when it is not
   * accepting contributions. The public page derives its Contribute form
   * from whether that charge is open, so there is no second flag to fall
   * out of step with where the money goes.
   */
  readonly contributionChargeId: string | null;
  /** First joined category name, displayed as the primary tag. */
  readonly category: string;
  /** All joined category names for filter chips + related lookups. */
  readonly categories: readonly string[];
  readonly status: ProjectStatus;
  readonly shortDescription: string;
  /**
   * Rendered description broken into paragraphs. Derived from
   * `description_html` at load time by splitting on `</p>` so the
   * public detail page keeps its per-paragraph fade-in animation.
   */
  readonly description: readonly string[];
  readonly image: string;
  readonly startedOn: string;
  readonly location: string;
  readonly lead: string;
  readonly featured?: boolean;
  readonly funding?: {
    readonly raised: number;
    readonly target: number;
    readonly currency: string;
  };
  readonly impact?: readonly ProjectImpact[];
  readonly milestones?: readonly ProjectMilestone[];
};

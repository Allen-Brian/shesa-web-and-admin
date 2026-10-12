export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; message: string };

export interface SectorInput {
  readonly name: string;
  readonly slug: string;
  readonly description?: string | null;
  readonly sortOrder: number;
}

export interface OrganInput {
  readonly sectorId: string;
  readonly slug: string;
  readonly name: string;
  readonly shortName?: string | null;
  readonly location?: string | null;
  readonly country?: string | null;
  readonly foundedYear?: number | null;
  readonly memberCount: number;
  readonly description?: string | null;
  readonly logoUrl?: string | null;
  readonly contactEmail?: string | null;
  readonly contactPhone?: string | null;
  readonly websiteUrl?: string | null;
  /** Ordered highlights for the branch page. Blank entries are dropped. */
  readonly achievements?: readonly string[];
  readonly sortOrder: number;
}

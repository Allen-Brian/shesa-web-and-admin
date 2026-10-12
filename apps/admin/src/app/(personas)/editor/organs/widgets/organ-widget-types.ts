export interface SectorRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly sortOrder: number;
}

export interface OrganRow {
  readonly id: string;
  readonly sectorId: string;
  readonly slug: string;
  readonly name: string;
  readonly shortName: string | null;
  readonly location: string | null;
  readonly country: string | null;
  readonly foundedYear: number | null;
  readonly memberCount: number;
  readonly description: string | null;
  readonly logoUrl: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly websiteUrl: string | null;
  readonly achievements: readonly string[];
  readonly sortOrder: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

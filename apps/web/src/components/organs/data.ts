/**
 * Public-site shape for organs + sectors. Sourced from `cms.organs`
 * and `cms.organ_sectors`. Every organ belongs to exactly one sector;
 * the public page groups the list by sector for a natural org-chart
 * reading order.
 */

export interface PublicOrgan {
  readonly id: string;
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
}

export interface PublicOrganSector {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly organs: readonly PublicOrgan[];
}

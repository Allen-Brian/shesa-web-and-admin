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
  /** Ordered highlights, as asked for by the Highlight Series. */
  readonly achievements: readonly string[];
}

/** One picture in a branch's album. Mirrors `cms.gallery_media`. */
export interface OrganPhoto {
  readonly id: string;
  readonly src: string;
  readonly alt: string | null;
  readonly aspect: string;
}

/**
 * A branch's own page: the organ, whoever leads it, and the album an
 * editor linked to it. All three are optional except the organ — a branch
 * with no president on record and no pictures yet still has a page.
 */
export interface OrganDetail {
  readonly organ: PublicOrgan;
  readonly sectorName: string | null;
  readonly leaders: readonly OrganLeader[];
  readonly albumTitle: string | null;
  readonly photos: readonly OrganPhoto[];
}

export interface OrganLeader {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly photo: string | null;
  readonly profession: string | null;
  readonly bio: string | null;
  readonly email: string | null;
  readonly phone: string | null;
}

export interface PublicOrganSector {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly organs: readonly PublicOrgan[];
}

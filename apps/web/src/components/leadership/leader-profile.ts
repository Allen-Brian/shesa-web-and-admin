/**
 * One leader's profile, as the modal needs it.
 *
 * The four strips on the Leadership page each carry their own row shape —
 * a mainstream `Leader` has a position and a sector, a `BranchPresident`
 * has a branch and a city, a `BatchPresident` has a batch. Rather than
 * force those four into one type, each maps into this on the way to the
 * modal. The strips keep saying what they mean; the modal takes one shape.
 */
export interface LeaderProfile {
  readonly name: string;
  /** "National President", "President · Buea Branch", "Batch of 1998". */
  readonly role: string;
  readonly location?: string | null;
  readonly photo: string;
  readonly profession?: string | null;
  readonly bio?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  /** Set when this leader heads a branch that has a page of its own. */
  readonly organHref?: string | null;
  readonly organName?: string | null;
}

/**
 * Is there anything here worth opening?
 *
 * A card only becomes clickable when the answer is yes. Every leader has
 * a name, a photo and a position, and all three are already on the card —
 * so a modal for a leader whose profile has not been filled in would open
 * onto what the reader just clicked. Editors fill these in over weeks, so
 * "most of them are empty" is the normal state for a while, not an edge
 * case.
 */
export function hasProfile(profile: LeaderProfile): boolean {
  return Boolean(
    profile.bio?.trim() ||
    profile.profession?.trim() ||
    profile.email?.trim() ||
    profile.phone?.trim() ||
    profile.organHref,
  );
}

/**
 * A lightweight reference to a Shesa member — just enough for permission
 * resolution and display, without dragging the entire profile through
 * every authorization check.
 *
 * Full member profiles live in `core.members` / `core.profiles` and are
 * loaded on demand by Server Actions that actually need them.
 */
export interface MemberRef {
  readonly memberId: string; // core.members.id
  readonly userId: string; // auth.users.id
  readonly displayName: string;
}

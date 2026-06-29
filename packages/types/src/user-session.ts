import type { MemberRef } from './member-ref';

/**
 * The resolved session a Server Action / middleware sees after reading
 * the Supabase Auth cookie. Domain-shaped, not Supabase-shaped:
 * the rest of the codebase should never depend on `@supabase/supabase-js`'s
 * `User` type directly.
 *
 * `member` is null while a Supabase Auth user exists but hasn't yet been
 * linked to a `core.members` row (e.g. just-invited, pre-claim). Server
 * Actions that require an active member must guard on this.
 */
export interface UserSession {
  readonly userId: string; // auth.users.id
  readonly email: string | null;
  readonly phone: string | null;
  readonly member: MemberRef | null;
}

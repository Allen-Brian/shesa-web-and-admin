'use server';

import { castBallot, type BallotInput, type NominationResult } from '@/lib/awards';

/**
 * A Server Action, for the same two reasons as the nomination one: the
 * client's address is only readable here and it is what the rate limit keys
 * on, and it keeps the anon key from being the only thing between a script
 * and the ballot box.
 *
 * The Exco token arrives from the page's own URL segment rather than from
 * anything the browser could set, and the database re-checks it — a client
 * cannot promote its own ballot by asserting a college.
 */
export async function vote(input: BallotInput): Promise<NominationResult> {
  return castBallot(input);
}

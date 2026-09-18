'use server';

import { submitNomination, type NominationInput, type NominationResult } from '@/lib/awards';

/**
 * A Server Action rather than a browser call to PostgREST, unlike the like
 * and view counters. Two reasons: the client's address is only readable on
 * the server, and it is what the rate limit is keyed on; and the anon key
 * would otherwise be the only thing standing between a script and the
 * nomination table.
 */
export async function nominate(input: NominationInput): Promise<NominationResult> {
  return submitNomination(input);
}

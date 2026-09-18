'use server';

import {
  submitNomination,
  suggestNominees,
  type NominationInput,
  type NominationResult,
} from '@/lib/awards';

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

/**
 * Names already put forward, for the nominee field's autocomplete.
 *
 * Also an action rather than a browser RPC — not for the IP this time, but
 * so the anon key is never the only thing guarding a function that returns
 * people's names.
 */
export async function suggestNames(query: string): Promise<readonly string[]> {
  return suggestNominees(query);
}

'use server';

import 'server-only';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

import { clientEnv } from '@shesa/config/env.client';

import { CUP } from '@/components/cup/cup-content';

import { getServerClient } from './supabase-server';

/**
 * The closing poll on the Quartier trailer.
 *
 * ─── Why this is a Server Action and not a direct RPC ─────────────────
 * The browser could call the function itself — it is granted to `anon`.
 * It goes through here for one reason: the rate limit is keyed on a hash
 * of the caller's address, and a browser cannot be trusted to report its
 * own address. `headers()` only exists on the server, so the hashing has
 * to happen here. The same reasoning is written up in `./awards.ts`.
 *
 * The second reason is the team list. `cup-content.ts` is the single file
 * the trailer's content is edited in, and the zone names have already been
 * renamed once. Passing them from here keeps the database free of a copy
 * that would drift, and means the browser cannot invent a fifth zone.
 */

const EDITION = CUP.edition;

/** The zone names, exactly as the content file spells them. */
function teamNames(): string[] {
  return CUP.zones.map((zone) => zone.name);
}

/**
 * The caller's address, salted and hashed.
 *
 * Hashed here so the table never becomes a log of who watched the trailer
 * from where. Follows `ipHash()` in `./awards.ts`.
 */
async function ipHash(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || h.get('cf-connecting-ip') || h.get('x-real-ip');
  if (!ip) return null;
  return createHash('sha256')
    .update(`cup:${clientEnv.NEXT_PUBLIC_APP_BASE_DOMAIN}:${ip}`)
    .digest('hex');
}

export interface CupTally {
  /** Zone name → votes. Every zone present, zero-filled. */
  readonly counts: Readonly<Record<string, number>>;
  readonly total: number;
}

interface ResultRow {
  readonly team: string;
  readonly votes: number | string;
  readonly total: number | string;
}

function toTally(rows: readonly ResultRow[] | null): CupTally {
  const counts: Record<string, number> = {};
  for (const name of teamNames()) counts[name] = 0;

  let total = 0;
  for (const row of rows ?? []) {
    // `bigint` comes back from PostgREST as a string once it is large
    // enough, so neither column is assumed to be a number.
    const votes = Number(row.votes) || 0;
    if (row.team in counts) counts[row.team] = votes;
    total = Number(row.total) || total;
  }
  return { counts, total };
}

/** The current tally. Returns zeroes rather than throwing if the call fails. */
export async function getCupTally(): Promise<CupTally> {
  try {
    const supabase = await getServerClient();
    const { data, error } = await supabase
      // The poll lives in `cms`, which is not the default schema. Leaving
      // this off is the bug class that silently killed the notification
      // feature — PostgREST looks in `public` and finds nothing.
      .schema('cms')
      .rpc('cup_poll_results', { p_edition: EDITION, p_teams: teamNames() });

    if (error) return toTally(null);
    return toTally(data as ResultRow[] | null);
  } catch {
    // A poll is never worth breaking the trailer over.
    return toTally(null);
  }
}

export type CupVoteReason = 'ok' | 'bad_device' | 'unknown_team' | 'rate_limited' | 'failed';

export interface CupVoteResult {
  readonly ok: boolean;
  readonly reason: CupVoteReason;
  /** The tally after the vote, so the slide needs one round trip. */
  readonly tally: CupTally;
}

/**
 * Cast or change this device's vote.
 *
 * Voting again replaces the earlier choice rather than being refused: a tap
 * on a different bar is a change of mind, and refusing it would leave the
 * slide showing a selection the tally disagrees with.
 */
export async function castCupVote(team: string, deviceId: string): Promise<CupVoteResult> {
  if (!deviceId || deviceId.length < 8 || deviceId.length > 64) {
    return { ok: false, reason: 'bad_device', tally: await getCupTally() };
  }

  try {
    const supabase = await getServerClient();
    const { data, error } = await supabase.schema('cms').rpc('cast_cup_vote', {
      p_edition: EDITION,
      p_team: team,
      p_device_id: deviceId,
      p_teams: teamNames(),
      p_ip_hash: (await ipHash()) ?? undefined,
    });

    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.ok) {
      const reason = (row?.reason as CupVoteReason) ?? 'failed';
      return { ok: false, reason, tally: await getCupTally() };
    }

    return { ok: true, reason: 'ok', tally: await getCupTally() };
  } catch {
    return { ok: false, reason: 'failed', tally: await getCupTally() };
  }
}

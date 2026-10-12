'use client';

import { clientEnv } from '@shesa/config/env.client';

/**
 * Client for the view/like counters in `cms.content_metrics`.
 *
 * Calls go straight to PostgREST with the anon key rather than through a
 * server action: they are unauthenticated, idempotent-ish, and firing a
 * server action for a view counter would put a round trip through the
 * Next server for a number nobody waits on.
 */

export type ContentKind = 'article' | 'event' | 'album' | 'song';

const VISITOR_KEY = 'shesa:visitor-id';
const VIEWED_PREFIX = 'shesa:viewed:';

/**
 * A stable per-browser identifier, generated on first use.
 *
 * This is what stops one person liking the same article twice from the
 * same browser — not who they are. Clearing storage yields a new id, and
 * that is the accepted limit of an unauthenticated like button.
 */
export function visitorId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;

    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(VISITOR_KEY, fresh);
    return fresh;
  } catch {
    // Private mode, or storage disabled. Views still count; likes will
    // simply not persist across reloads.
    return '';
  }
}

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(`${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        authorization: `Bearer ${clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        // The counters live in `cms`, which is not the default schema.
        'accept-profile': 'cms',
        'content-profile': 'cms',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    // A counter is never worth breaking a page over.
    return null;
  }
}

/**
 * Count one view.
 *
 * The database decides whether it is a new one: it keeps a row per
 * visitor per item, so a second open by the same browser changes
 * nothing however many times this is called. The session guard below
 * only saves the round trip.
 */
export async function recordView(kind: ContentKind, entityId: string): Promise<void> {
  if (typeof window === 'undefined' || !entityId) return;

  const key = `${VIEWED_PREFIX}${kind}:${entityId}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    /* No session storage: send it, and let the server dedupe. */
  }

  await rpc('record_content_view', {
    p_kind: kind,
    p_entity_id: entityId,
    p_visitor_id: visitorId() || null,
  });
}

export interface LikeState {
  readonly liked: boolean;
  readonly likes: number;
}

/** Like or unlike; returns the resulting state, or null if the call failed. */
export async function toggleLike(kind: ContentKind, entityId: string): Promise<LikeState | null> {
  const visitor = visitorId();
  if (!visitor) return null;

  const rows = await rpc<Array<{ liked: boolean; likes: number }>>('toggle_content_like', {
    p_kind: kind,
    p_entity_id: entityId,
    p_visitor_id: visitor,
  });
  const first = Array.isArray(rows) ? rows[0] : null;
  return first ? { liked: first.liked, likes: Number(first.likes) } : null;
}

/**
 * Count one playback of one song.
 *
 * No visitor id and no session guard, unlike `recordView` — there is
 * nothing to deduplicate against. Views count people; plays count
 * listens, so a replay, an auto-advance into the next track and the same
 * anthem every morning are all supposed to register.
 *
 * Not awaited by callers: this fires from inside playback, where the one
 * thing that must not happen is the audio waiting on the network.
 */
export async function recordPlay(entityId: string): Promise<void> {
  if (typeof window === 'undefined' || !entityId) return;
  await rpc('record_song_play', { p_entity_id: entityId });
}

export interface ContentMetrics {
  readonly entityId: string;
  readonly views: number;
  readonly likes: number;
  /** Cumulative playbacks. Songs only; zero for every other kind. */
  readonly plays: number;
  readonly liked: boolean;
}

/** Counts for a set of items of one kind, in a single call. */
export async function fetchMetrics(
  kind: ContentKind,
  entityIds: readonly string[],
): Promise<readonly ContentMetrics[]> {
  if (entityIds.length === 0) return [];

  const rows = await rpc<
    Array<{ entity_id: string; views: number; likes: number; plays: number; liked: boolean }>
  >('get_content_metrics', {
    p_kind: kind,
    p_entity_ids: entityIds,
    p_visitor_id: visitorId() || null,
  });
  if (!Array.isArray(rows)) return [];

  return rows.map((r) => ({
    entityId: r.entity_id,
    views: Number(r.views),
    likes: Number(r.likes),
    plays: Number(r.plays ?? 0),
    liked: Boolean(r.liked),
  }));
}

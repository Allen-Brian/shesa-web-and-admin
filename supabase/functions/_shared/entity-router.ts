/**
 * Shared entity-router — the small dispatcher every grouped Edge Function
 * uses to route based on the last URL path segment.
 *
 * The 2026-07-03 Edge Function reorg groups related actions under a single
 * entity folder (e.g. `supabase/functions/networks/`). Each entity has one
 * `index.ts` that calls `Deno.serve(entityRouter(...))` with a map of
 * action → handler. Client code invokes `functions.invoke('networks/<action>', ...)`
 * which lands on the same underlying URL (`/functions/v1/networks/<action>`);
 * this helper picks the last path segment and calls the matching handler.
 *
 * Handlers are plain `(req: Request) => Promise<Response>` fns — they own
 * their own auth, validation, and audit. This module just does the
 * preflight + dispatch, keeping the entity index.ts tiny.
 */

import { handlePreflight, withCors } from './cors.ts';

export type ActionHandler = (req: Request) => Promise<Response>;
export type ActionMap = Record<string, ActionHandler>;

export function entityRouter(actions: ActionMap): (req: Request) => Promise<Response> {
  return async (req) => {
    const preflight = handlePreflight(req);
    if (preflight) return preflight;

    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const action = segments[segments.length - 1] ?? '';
    const handler = actions[action];

    if (!handler) {
      return withCors(
        req,
        new Response(
          JSON.stringify({
            status: 404,
            code: 'UNKNOWN_ACTION',
            message: `Unknown action "${action}"`,
            available: Object.keys(actions),
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    }

    return handler(req);
  };
}

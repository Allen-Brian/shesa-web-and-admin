/**
 * Entity Edge Function: networks/
 *
 * Serves every network action at /functions/v1/networks/{action}. Each
 * action lives in its own file (create-network.ts, update-network.ts,
 * …) and exports a handler; this router picks the last path segment and
 * dispatches. Preflight + 404 fallback come from `_shared/entity-router`.
 *
 * Add a new action:
 *   1. Create `networks/<action>.ts` that exports a handler.
 *   2. Wire it into the map below.
 *   3. Clients call `supabase.functions.invoke('networks/<action>', ...)`.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { createNetwork } from './create-network.ts';
import { updateNetwork } from './update-network.ts';

Deno.serve(
  entityRouter({
    'create-network': createNetwork,
    'update-network': updateNetwork,
  }),
);

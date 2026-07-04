/**
 * Entity Edge Function: audience/
 *
 * Serves audience-engine actions at /functions/v1/audience/{action}:
 *   - audience/count   — cheap COUNT(*) for the live preview
 *   - audience/resolve — full member ID list (external / debug callers)
 *
 * The heavy lifting is in the DB — exco.resolve_audience(jsonb) and
 * exco.count_audience(jsonb). These handlers own auth + input validation.
 *
 * Add a new action:
 *   1. Create audience/<action>.ts that exports a handler.
 *   2. Wire it into the map below.
 *   3. Clients call `supabase.functions.invoke('audience/<action>', ...)`.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { countAudience } from './count.ts';
import { resolveAudience } from './resolve.ts';

Deno.serve(
  entityRouter({
    count: countAudience,
    resolve: resolveAudience,
  }),
);

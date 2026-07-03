/**
 * Entity Edge Function: scopes/
 *
 * Auto-migrated 2026-07-03 as part of the flat-to-entity reorg.
 * Each action lives in its own file; this router dispatches based
 * on the last URL path segment. See `_shared/entity-router.ts`.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { createScope } from './create-scope.ts';
import { updateScope } from './update-scope.ts';
import { createNextYearBatch } from './create-next-year-batch.ts';

Deno.serve(
  entityRouter({
    'create-scope': createScope,
    'update-scope': updateScope,
    'create-next-year-batch': createNextYearBatch,
  }),
);

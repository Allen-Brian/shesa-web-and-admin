/**
 * Entity Edge Function: branches/
 *
 * Serves every branch action at /functions/v1/branches/{action}. See
 * `_shared/entity-router.ts` for the dispatch pattern.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { createBranch } from './create-branch.ts';
import { updateBranch } from './update-branch.ts';

Deno.serve(
  entityRouter({
    'create-branch': createBranch,
    'update-branch': updateBranch,
  }),
);

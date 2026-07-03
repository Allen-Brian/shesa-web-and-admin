/**
 * Entity Edge Function: roles/
 *
 * Auto-migrated 2026-07-03 as part of the flat-to-entity reorg.
 * Each action lives in its own file; this router dispatches based
 * on the last URL path segment. See `_shared/entity-router.ts`.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { grantRole } from './grant-role.ts';
import { revokeRole } from './revoke-role.ts';
import { grantGlobalRecruiter } from './grant-global-recruiter.ts';
import { revokeGlobalRecruiter } from './revoke-global-recruiter.ts';
import { checkPermission } from './check-permission.ts';

Deno.serve(
  entityRouter({
    'grant-role': grantRole,
    'revoke-role': revokeRole,
    'grant-global-recruiter': grantGlobalRecruiter,
    'revoke-global-recruiter': revokeGlobalRecruiter,
    'check-permission': checkPermission,
  }),
);

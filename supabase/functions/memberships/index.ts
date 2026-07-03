/**
 * Entity Edge Function: memberships/
 *
 * Auto-migrated 2026-07-03 as part of the flat-to-entity reorg.
 * Each action lives in its own file; this router dispatches based
 * on the last URL path segment. See `_shared/entity-router.ts`.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { requestJoinBody } from './request-join-body.ts';
import { approveJoinRequest } from './approve-join-request.ts';
import { rejectJoinRequest } from './reject-join-request.ts';
import { requestTransfer } from './request-transfer.ts';
import { approveTransfer } from './approve-transfer.ts';

Deno.serve(
  entityRouter({
    'request-join-body': requestJoinBody,
    'approve-join-request': approveJoinRequest,
    'reject-join-request': rejectJoinRequest,
    'request-transfer': requestTransfer,
    'approve-transfer': approveTransfer,
  }),
);

/**
 * Entity Edge Function: imports/
 *
 * Auto-migrated 2026-07-03 as part of the flat-to-entity reorg.
 * Each action lives in its own file; this router dispatches based
 * on the last URL path segment. See `_shared/entity-router.ts`.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { uploadMemberImport } from './upload-member-import.ts';
import { validateMemberImport } from './validate-member-import.ts';
import { confirmMemberImport } from './confirm-member-import.ts';

Deno.serve(
  entityRouter({
    'upload-member-import': uploadMemberImport,
    'validate-member-import': validateMemberImport,
    'confirm-member-import': confirmMemberImport,
  }),
);

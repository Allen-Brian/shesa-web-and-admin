/**
 * Entity Edge Function: positions/
 *
 * Auto-migrated 2026-07-03 as part of the flat-to-entity reorg.
 * Each action lives in its own file; this router dispatches based
 * on the last URL path segment. See `_shared/entity-router.ts`.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { assignPosition } from './assign-position.ts';
import { removePosition } from './remove-position.ts';
import { createPositionCatalogEntry } from './create-position-catalog-entry.ts';
import { updatePositionCatalogEntry } from './update-position-catalog-entry.ts';

Deno.serve(
  entityRouter({
    'assign-position': assignPosition,
    'remove-position': removePosition,
    'create-position-catalog-entry': createPositionCatalogEntry,
    'update-position-catalog-entry': updatePositionCatalogEntry,
  }),
);

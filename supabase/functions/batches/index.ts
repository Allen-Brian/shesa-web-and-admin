/**
 * Entity Edge Function: batches/
 *
 * Serves every batch action at /functions/v1/batches/{action}.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { createBatch } from './create-batch.ts';
import { updateBatch } from './update-batch.ts';

Deno.serve(
  entityRouter({
    'create-batch': createBatch,
    'update-batch': updateBatch,
  }),
);

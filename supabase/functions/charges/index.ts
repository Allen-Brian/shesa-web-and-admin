/**
 * Entity Edge Function: charges/
 *
 * Serves /functions/v1/charges/{action}. Per ADR-0033, every write to
 * finance.charges lands here — Server Actions cannot mutate the table
 * directly.
 *
 * Actions:
 *   create               — draft insert; shape-specific rules enforced up front
 *   update               — patch a draft/paused row + status transitions
 *   archive              — soft-remove (status='archived'); related obligations stay
 *   generate-obligations — manual fire of obligation generation for one
 *                          charge (per-charge auth) or the whole sweep
 *                          (mainstream-admin only). The scheduled path is
 *                          pg_cron — this endpoint is for "generate now"
 *                          without waiting for the next hourly tick.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { archiveCharge } from './archive.ts';
import { createCharge } from './create.ts';
import { generateObligations } from './generate-obligations.ts';
import { updateCharge } from './update.ts';

Deno.serve(
  entityRouter({
    create: createCharge,
    update: updateCharge,
    archive: archiveCharge,
    'generate-obligations': generateObligations,
  }),
);

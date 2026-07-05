/**
 * Entity Edge Function: charges/
 *
 * Serves /functions/v1/charges/{action}. Per ADR-0033, every write to
 * finance.charges lands here — Server Actions cannot mutate the table
 * directly.
 *
 * Actions:
 *   create   — draft insert; shape-specific rules enforced up front
 *   update   — patch a draft/paused row + status transitions
 *   archive  — soft-remove (status='archived'); related obligations stay
 *
 * Deferred to M2B (obligation-generation milestone):
 *   generate-obligations — the workhorse. Runs on the charge's schedule
 *                          via pg_cron; resolves the target audience and
 *                          inserts the obligations for the period.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { archiveCharge } from './archive.ts';
import { createCharge } from './create.ts';
import { updateCharge } from './update.ts';

Deno.serve(
  entityRouter({
    create: createCharge,
    update: updateCharge,
    archive: archiveCharge,
  }),
);

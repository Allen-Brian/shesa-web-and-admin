/**
 * Entity Edge Function: charges/
 *
 * Serves /functions/v1/charges/{action}. Per ADR-0033, every write to
 * finance.charges lands here — Server Actions cannot mutate the table
 * directly.
 *
 * "One primitive" (spec Part II): charges + contributions live in one
 * table with one schema, one Edge Function namespace. The shape column
 * selects behavior. Contribution-only actions (approve / close / extend)
 * reject non-contribution shapes with a clean 409.
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
 *   approve              — Finance approves an Admin-proposed contribution.
 *                          Transitions draft → open. Contribution shapes only.
 *   close                — Finance closes an open contribution early.
 *                          Transitions open → closed.
 *   extend               — Extends a contribution's close_date past the
 *                          current one (audits into contribution_extensions).
 *                          Reopens closed → open when applicable.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { approveContribution } from './approve.ts';
import { archiveCharge } from './archive.ts';
import { closeContribution } from './close.ts';
import { createCharge } from './create.ts';
import { extendContribution } from './extend.ts';
import { generateObligations } from './generate-obligations.ts';
import { updateCharge } from './update.ts';

Deno.serve(
  entityRouter({
    create: createCharge,
    update: updateCharge,
    archive: archiveCharge,
    'generate-obligations': generateObligations,
    approve: approveContribution,
    close: closeContribution,
    extend: extendContribution,
  }),
);

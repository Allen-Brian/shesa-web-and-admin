/**
 * Entity Edge Function: fapshi/
 *
 * Serves /functions/v1/fapshi/{action}. Everything Fapshi-specific
 * lives here so we can carry a single verify_jwt=false setting for
 * the whole group without loosening auth on the shared payments/
 * function (which stays authenticated for admin flows).
 *
 * Actions:
 *   webhook    — public. Fapshi calls this on SUCCESSFUL/FAILED/EXPIRED.
 *                Gated at the handler with the x-wh-secret header.
 *   status     — public. Pending-page polling by intent_id.
 *   reconcile  — service-role gated. Called by pg_cron every ~2 min to
 *                catch webhook deliveries that were lost (Fapshi does
 *                NOT retry — the reconcile loop is not optional).
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { fapshiReconcile } from './reconcile.ts';
import { fapshiStatus } from './status.ts';
import { fapshiWebhook } from './webhook.ts';

Deno.serve(
  entityRouter({
    webhook: fapshiWebhook,
    status: fapshiStatus,
    reconcile: fapshiReconcile,
  }),
);

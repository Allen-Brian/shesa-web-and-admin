/**
 * Entity Edge Function: notifications/
 *
 * Auto-migrated 2026-07-03 as part of the flat-to-entity reorg.
 * Each action lives in its own file; this router dispatches based
 * on the last URL path segment. See `_shared/entity-router.ts`.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { dispatchNotifications } from './dispatch-notifications.ts';
import { enqueueNotification } from './enqueue-notification.ts';
import { sendEmail } from './send-email.ts';
import { sendSmsStub } from './send-sms-stub.ts';

Deno.serve(
  entityRouter({
    'dispatch-notifications': dispatchNotifications,
    'enqueue-notification': enqueueNotification,
    'send-email': sendEmail,
    'send-sms-stub': sendSmsStub,
  }),
);

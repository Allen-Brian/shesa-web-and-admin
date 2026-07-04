/**
 * Entity Edge Function: events/
 *
 * Serves /functions/v1/events/{action}. Per ADR-0033 Phase 2, ALL
 * writes to exco.events go through here — Server Actions cannot
 * mutate the table directly.
 *
 * Actions:
 *   create   — draft insert (+ optional program items batch)
 *   update   — patch a draft/scheduled row
 *   publish  — resolve audience → fan out to notification_events +
 *              deliveries → status='published' + snapshot
 *   archive  — soft-remove (status='archived')
 *
 * Deferred to follow-up epics:
 *   duplicate    — clone an event as a new draft (Slice E-duplicate)
 *   material-edit change-notification (post-publish edits that
 *                 trigger a reminder-announcement per the spec)
 *   cancel       — status='unpublished' (Slice E-cancel)
 *   reminder-emission (pg_cron sweep over active published events)
 *   program-items (dedicated create/update/delete endpoints for
 *                 event_program_items after event exists)
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { archiveEvent } from './archive.ts';
import { createEvent } from './create.ts';
import { publishEvent } from './publish.ts';
import { updateEvent } from './update.ts';

Deno.serve(
  entityRouter({
    create: createEvent,
    update: updateEvent,
    publish: publishEvent,
    archive: archiveEvent,
  }),
);

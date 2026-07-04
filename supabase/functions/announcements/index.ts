/**
 * Entity Edge Function: announcements/
 *
 * Serves /functions/v1/announcements/{action}. Per ADR-0033 Phase 2
 * refinement, ALL writes to exco.announcements go through here — Server
 * Actions cannot mutate the table directly.
 *
 * Actions:
 *   create   — draft insert
 *   update   — patch a draft/scheduled row
 *   publish  — resolve audience → fan out to notification_events + deliveries → status='published'
 *   archive  — soft-remove (status='archived')
 *
 * Deferred to a follow-up (spec has them; MVP doesn't):
 *   schedule    — status='scheduled' + pg_cron sweep publish
 *   unpublish   — flips 'published' → 'unpublished'
 *   mark-read   — moves per-user unread state on notification_deliveries
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { archiveAnnouncement } from './archive.ts';
import { createAnnouncement } from './create.ts';
import { publishAnnouncement } from './publish.ts';
import { updateAnnouncement } from './update.ts';

Deno.serve(
  entityRouter({
    create: createAnnouncement,
    update: updateAnnouncement,
    publish: publishAnnouncement,
    archive: archiveAnnouncement,
  }),
);

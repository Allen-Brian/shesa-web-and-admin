/**
 * Action: events/update
 *
 * PATCH-style update for a draft or scheduled event. Every field is
 * optional; unspecified fields stay unchanged. Once an event is
 * 'published', edits go through the (future) material-change flow
 * that emits a change-notification to the resolved audience — this
 * endpoint refuses to touch published / unpublished / archived rows.
 *
 * Any status except `archived` is editable. Archived rows are
 * soft-deleted — restore them (out of scope for this endpoint) before
 * editing. The (future) material-change flow that emits a change
 * notification to the resolved audience will layer on top of this
 * endpoint; today, published-event edits are silent field updates.
 *
 * Program items are handled as a replace-all set when the client
 * sends `programItems`. Existing children are deleted before the new
 * set is inserted.
 *
 * Auth: event.update at the row's owner_scope_id.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  conflict,
  forbidden,
  internalError,
  notFound,
  success,
  unauthorized,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const EVENT_TYPES = [
  'sports',
  'entertainment',
  'meeting',
  'mentorship',
  'assembly',
  'networking',
  'fundraiser',
  'community_service',
  'cultural',
  'training',
  'ceremony',
  'celebration',
  'conference',
  'other',
] as const;

const REMINDER_CADENCES = ['weekly', 'biweekly', 'monthly'] as const;

const programItemSchema = z
  .object({
    startsAt: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    title: z.string().trim().min(1).max(200),
    detail: z.string().max(2000).nullable().optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .strict();

const inputSchema = z
  .object({
    id: z.string().uuid(),

    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().optional(),
    advertImageUrls: z.array(z.string()).max(20).optional(),
    types: z.array(z.enum(EVENT_TYPES)).max(EVENT_TYPES.length).optional(),

    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    timezone: z.string().min(1).optional(),

    venueName: z.string().max(200).nullable().optional(),
    venueAddress: z.string().max(500).nullable().optional(),
    venueMapUrl: z.string().max(1000).nullable().optional(),
    onlineUrl: z.string().max(1000).nullable().optional(),

    audienceDefinition: z.record(z.unknown()).optional(),
    rsvpEnabled: z.boolean().optional(),
    contributionChargeId: z.string().uuid().nullable().optional(),

    reminderCadence: z.enum(REMINDER_CADENCES).nullable().optional(),
    reminderStartAt: z.string().datetime().nullable().optional(),
    reminderCustomMessage: z.string().max(500).nullable().optional(),

    scheduledPublishAt: z.string().datetime().nullable().optional(),

    programItems: z.array(programItemSchema).max(100).optional(),
  })
  .strict();

interface EventRow {
  readonly id: string;
  readonly owner_scope_id: string;
  readonly status: string;
}

interface SuccessBody {
  readonly id: string;
  readonly traceId: string;
}

export async function updateEvent(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();
  const { data: existing, error: loadErr } = await serviceClient
    .schema('exco' as never)
    .from('events' as never)
    .select('id, owner_scope_id, status')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'events/update: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('event', ctx.traceId));

  const row = existing as EventRow;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'event.update',
    scopeId: row.owner_scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('event.update', ctx.traceId, { scopeId: row.owner_scope_id }));
  }

  // Archived rows are soft-deleted; restore before editing.
  if (row.status === 'archived') {
    return withCors(
      req,
      conflict(
        'EVENT_NOT_EDITABLE',
        'Cannot update an archived event. Restore it first.',
        ctx.traceId,
      ),
    );
  }

  const patch: Record<string, unknown> = { updated_by: ctx.userId };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.advertImageUrls !== undefined) patch.advert_image_urls = input.advertImageUrls;
  if (input.types !== undefined) patch.types = input.types;
  if (input.startAt !== undefined) patch.start_at = input.startAt;
  if (input.endAt !== undefined) patch.end_at = input.endAt;
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  if (input.venueName !== undefined) patch.venue_name = input.venueName;
  if (input.venueAddress !== undefined) patch.venue_address = input.venueAddress;
  if (input.venueMapUrl !== undefined) patch.venue_map_url = input.venueMapUrl;
  if (input.onlineUrl !== undefined) patch.online_url = input.onlineUrl;
  if (input.audienceDefinition !== undefined) patch.audience_definition = input.audienceDefinition;
  if (input.rsvpEnabled !== undefined) patch.rsvp_enabled = input.rsvpEnabled;
  if (input.contributionChargeId !== undefined)
    patch.contribution_charge_id = input.contributionChargeId;
  if (input.reminderCadence !== undefined) patch.reminder_cadence = input.reminderCadence;
  if (input.reminderStartAt !== undefined) patch.reminder_start_at = input.reminderStartAt;
  if (input.reminderCustomMessage !== undefined)
    patch.reminder_custom_message = input.reminderCustomMessage;
  if (input.scheduledPublishAt !== undefined) {
    patch.scheduled_publish_at = input.scheduledPublishAt;
    // Only flip status when the caller is genuinely (re-)scheduling.
    // Clearing scheduled_publish_at on a published/unpublished row
    // must NOT knock it back to draft — that would silently undo a
    // publish. Draft/scheduled rows still track the schedule flag.
    if (input.scheduledPublishAt && new Date(input.scheduledPublishAt).getTime() > Date.now()) {
      patch.status = 'scheduled';
    } else if (row.status === 'draft' || row.status === 'scheduled') {
      patch.status = 'draft';
    }
  }

  const { error: updateErr } = await serviceClient
    .schema('exco' as never)
    .from('events' as never)
    .update(patch as never)
    .eq('id', input.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'events/update: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  // Program items — replace-all when supplied. Safe here because the
  // endpoint only touches draft/scheduled events (nobody's reading the
  // agenda mid-swap).
  if (input.programItems !== undefined) {
    const { error: delErr } = await serviceClient
      .schema('exco' as never)
      .from('event_program_items' as never)
      .delete()
      .eq('event_id', input.id);
    if (delErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'events/update: program items delete failed',
          code: delErr.code,
          error: delErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }

    if (input.programItems.length > 0) {
      const rows = input.programItems.map((p, idx) => ({
        event_id: input.id,
        starts_at: p.startsAt.length === 5 ? `${p.startsAt}:00` : p.startsAt,
        title: p.title,
        detail: p.detail ?? null,
        sort_order: p.sortOrder ?? idx,
      }));
      const { error: insErr } = await serviceClient
        .schema('exco' as never)
        .from('event_program_items' as never)
        .insert(rows as never);
      if (insErr) {
        console.error(
          JSON.stringify({
            level: 'error',
            traceId: ctx.traceId,
            message: 'events/update: program items insert failed',
            code: insErr.code,
            error: insErr.message,
          }),
        );
        return withCors(req, internalError(ctx.traceId));
      }
    }
  }

  await logEvent(serviceClient, ctx, {
    action: 'event.updated',
    entitySchema: 'exco',
    entityTable: 'events',
    entityId: input.id,
    scopeId: row.owner_scope_id,
    metadata: { fieldsChanged: Object.keys(patch).filter((k) => k !== 'updated_by') },
  });

  const body: SuccessBody = { id: input.id, traceId: ctx.traceId };
  return withCors(req, success(body));
}

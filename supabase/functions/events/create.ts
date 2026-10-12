/**
 * Action: events/create
 *
 * POST /functions/v1/events/create — inserts a new event row at the
 * caller's chosen owner scope, plus (optionally) a batch of program
 * items. Follows the announcements/create pattern:
 *   - auth (event.create at ownerScopeId)
 *   - Zod-validate input
 *   - service-role INSERT (exco.events has no INSERT policy for
 *     authenticated per ADR-0033 Phase 2)
 *   - audit trail
 *
 * Derives the initial status from `scheduledPublishAt`:
 *   present + future  → 'scheduled' (+ scheduled_publish_at set)
 *   absent            → 'draft'
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, success, unauthorized } from '../_shared/errors.ts';
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

// A single wall-clock program item within the event's day.
const programItemSchema = z
  .object({
    // "HH:mm" wall-clock time within the day. Postgres TIME accepts
    // either "HH:mm" or "HH:mm:ss"; we normalize to "HH:mm:00".
    startsAt: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'startsAt must be HH:mm or HH:mm:ss'),
    title: z.string().trim().min(1).max(200),
    detail: z.string().max(2000).nullish(),
    sortOrder: z.number().int().min(0).max(999).default(0),
  })
  .strict();

const inputSchema = z
  .object({
    ownerScopeId: z.string().uuid(),

    // Content
    name: z.string().trim().min(1).max(200),
    description: z.string().default(''),
    advertImageUrls: z.array(z.string()).max(20).default([]),
    types: z.array(z.enum(EVENT_TYPES)).max(EVENT_TYPES.length).default([]),

    // Schedule — ISO datetimes; DB stores TIMESTAMPTZ.
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    timezone: z.string().min(1).default('UTC'),

    // Venue / mode — at least one of venueName or onlineUrl must be
    // set (DB CHECK enforces; we surface a clearer message here).
    venueName: z.string().max(200).nullish(),
    venueAddress: z.string().max(500).nullish(),
    venueMapUrl: z.string().max(1000).nullish(),
    onlineUrl: z.string().max(1000).nullish(),

    // Audience — validated by the SQL resolver at publish time.
    audienceDefinition: z.record(z.unknown()).default({}),

    // On-create locked-once options
    rsvpEnabled: z.boolean().default(false),
    contributionChargeId: z.string().uuid().nullish(),

    // Reminders (cadence generator lands separately)
    reminderCadence: z.enum(REMINDER_CADENCES).nullish(),
    reminderStartAt: z.string().datetime().nullish(),
    reminderCustomMessage: z.string().max(500).nullish(),

    // Lifecycle — populated when the caller wants a scheduled event.
    scheduledPublishAt: z.string().datetime().nullish(),

    // Program items (agenda)
    programItems: z.array(programItemSchema).max(50).default([]),
  })
  .strict()
  .refine((v) => Boolean(v.venueName || v.onlineUrl), {
    message: 'At least one of venueName or onlineUrl must be provided',
    path: ['venueName'],
  })
  .refine((v) => new Date(v.endAt).getTime() >= new Date(v.startAt).getTime(), {
    message: 'endAt must be on or after startAt',
    path: ['endAt'],
  });

interface SuccessBody {
  readonly id: string;
  readonly programItemCount: number;
  readonly traceId: string;
}

export async function createEvent(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'event.create',
    scopeId: input.ownerScopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('event.create', ctx.traceId, { scopeId: input.ownerScopeId }));
  }

  // Status + scheduled time derivation — mirrors announcements/create.
  const scheduledPublishAt = input.scheduledPublishAt ?? null;
  const initialStatus: 'draft' | 'scheduled' =
    scheduledPublishAt && new Date(scheduledPublishAt).getTime() > Date.now()
      ? 'scheduled'
      : 'draft';

  const serviceClient = createServiceRoleClient();
  const { data: row, error } = await serviceClient
    .schema('exco' as never)
    .from('events' as never)
    .insert({
      owner_scope_id: input.ownerScopeId,
      name: input.name,
      description: input.description,
      advert_image_urls: input.advertImageUrls,
      types: input.types,
      start_at: input.startAt,
      end_at: input.endAt,
      timezone: input.timezone,
      venue_name: input.venueName ?? null,
      venue_address: input.venueAddress ?? null,
      venue_map_url: input.venueMapUrl ?? null,
      online_url: input.onlineUrl ?? null,
      audience_definition: input.audienceDefinition,
      rsvp_enabled: input.rsvpEnabled,
      contribution_charge_id: input.contributionChargeId ?? null,
      reminder_cadence: input.reminderCadence ?? null,
      reminder_start_at: input.reminderStartAt ?? null,
      reminder_custom_message: input.reminderCustomMessage ?? null,
      status: initialStatus,
      scheduled_publish_at: initialStatus === 'scheduled' ? scheduledPublishAt : null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    } as never)
    .select('id')
    .maybeSingle();

  if (error || !row) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'events/create: insert failed',
        code: error?.code,
        error: error?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const eventId = (row as { id: string }).id;

  // Program items — batch insert. Normalize HH:mm → HH:mm:00 for
  // Postgres TIME.
  let programItemCount = 0;
  if (input.programItems.length > 0) {
    const rows = input.programItems.map((p, idx) => ({
      event_id: eventId,
      starts_at: p.startsAt.length === 5 ? `${p.startsAt}:00` : p.startsAt,
      title: p.title,
      detail: p.detail ?? null,
      sort_order: p.sortOrder ?? idx,
    }));
    const { error: piErr } = await serviceClient
      .schema('exco' as never)
      .from('event_program_items' as never)
      .insert(rows as never);
    if (piErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'events/create: program_items insert failed',
          code: piErr.code,
          error: piErr.message,
          eventId,
        }),
      );
      // Continue: the parent event row is intact. The client can
      // retry program items via a dedicated endpoint. Better than
      // rolling back the whole event on an agenda blip.
    } else {
      programItemCount = rows.length;
    }
  }

  await logEvent(serviceClient, ctx, {
    action: 'event.created',
    entitySchema: 'exco',
    entityTable: 'events',
    entityId: eventId,
    scopeId: input.ownerScopeId,
    metadata: {
      name: input.name,
      types: input.types,
      startAt: input.startAt,
      programItemCount,
      status: initialStatus,
    },
  });

  const body: SuccessBody = { id: eventId, programItemCount, traceId: ctx.traceId };
  return withCors(req, success(body, 201));
}

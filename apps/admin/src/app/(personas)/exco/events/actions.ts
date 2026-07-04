'use server';

import { revalidatePath } from 'next/cache';

import { clientEnv } from '@shesa/config/env.client';
import { AUDIENCE_ALL, AudienceDefinition } from '@shesa/domain/audience';
import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

/**
 * Server Actions for exco.events — the envelope layer per ADR-0033.
 * All mutations go through the events/* Edge Functions.
 */

// ─── Row-level actions used by the list ──────────────────────────────

/** Publish an event immediately — audience resolve + fan-out server-side. */
export async function publishEvent(
  id: string,
): Promise<{ ok: boolean; message?: string; id: string }> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('events/publish', { body: { id } });
  if (error) {
    return { ok: false, id, message: await extractInvokeMessage(error, 'Could not publish.') };
  }
  revalidatePath('/exco/events');
  return { ok: true, id };
}

/** Soft-archive an event. Delivery + RSVP rows retained. */
export async function archiveEvent(
  id: string,
): Promise<{ ok: boolean; message?: string; id: string }> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('events/archive', { body: { id } });
  if (error) {
    return { ok: false, id, message: await extractInvokeMessage(error, 'Could not archive.') };
  }
  revalidatePath('/exco/events');
  return { ok: true, id };
}

// ─── Form state contract ─────────────────────────────────────────────

export type EventFormState =
  | { ok: true; id?: string; published?: boolean }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<EventFormField, string>>;
      values?: Partial<Record<EventFormField, string>>;
    };

type EventFormField =
  'ownerScopeId' | 'name' | 'description' | 'startAt' | 'endAt' | 'scheduledPublishAt' | 'venue';

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
type EventType = (typeof EVENT_TYPES)[number];

interface ProgramItemInput {
  readonly startsAt: string;
  readonly title: string;
  readonly detail?: string | null;
  readonly sortOrder?: number;
}

// ─── createEvent — the form's submit action ──────────────────────────

/**
 * Create an event. Reads FormData; intent (draft / schedule / publish)
 * comes from the named submit button.
 *
 * The Edge Function validates fully with Zod. This action does light
 * shape work — pulling JSON hidden inputs, normalizing empties,
 * mapping intent → status → chain publish if needed.
 */
export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const readString = (k: string) => {
    const raw = formData.get(k);
    return typeof raw === 'string' ? raw.trim() : '';
  };
  const readNullableString = (k: string) => {
    const s = readString(k);
    return s === '' ? null : s;
  };

  const ownerScopeId = readString('ownerScopeId');
  const name = readString('name');
  const description = readString('description');
  const timezone = readString('timezone') || 'UTC';

  const startAt = readString('startAt');
  const endAt = readString('endAt');

  const venueName = readNullableString('venueName');
  const venueAddress = readNullableString('venueAddress');
  const venueMapUrl = readNullableString('venueMapUrl');
  const onlineUrl = readNullableString('onlineUrl');

  const rsvpEnabled = formData.get('rsvpEnabled') === 'on';
  const scheduledPublishAtRaw = readString('scheduledPublishAt');
  const intent = readString('intent') as 'draft' | 'schedule' | 'publish' | '';

  const reminderCadenceRaw = readString('reminderCadence');
  const reminderCadence =
    reminderCadenceRaw === 'weekly' ||
    reminderCadenceRaw === 'biweekly' ||
    reminderCadenceRaw === 'monthly'
      ? reminderCadenceRaw
      : null;
  const reminderStartAt = readNullableString('reminderStartAt');
  const reminderCustomMessage = readNullableString('reminderCustomMessage');
  const contributionChargeId = readNullableString('contributionChargeId');

  const fieldErrors: Partial<Record<EventFormField, string>> = {};
  if (!ownerScopeId) fieldErrors.ownerScopeId = 'Pick a scope to publish under.';
  if (!name) fieldErrors.name = 'Event name is required.';
  else if (name.length > 200) fieldErrors.name = 'Event name must be under 200 characters.';
  if (!startAt) fieldErrors.startAt = 'Start date and time are required.';
  if (!endAt) fieldErrors.endAt = 'End date and time are required.';
  if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
    fieldErrors.endAt = 'End must be on or after start.';
  }
  if (!venueName && !onlineUrl) {
    fieldErrors.venue = 'At least one of Venue or Online URL is required.';
  }

  let scheduledPublishAt: string | null = null;
  if (intent === 'schedule') {
    if (!scheduledPublishAtRaw) {
      fieldErrors.scheduledPublishAt = 'Pick a date and time to schedule for.';
    } else {
      const when = new Date(scheduledPublishAtRaw);
      if (Number.isNaN(when.getTime())) {
        fieldErrors.scheduledPublishAt = 'Invalid schedule time.';
      } else if (when.getTime() <= Date.now()) {
        fieldErrors.scheduledPublishAt = 'Schedule time must be in the future.';
      } else {
        scheduledPublishAt = when.toISOString();
      }
    }
  }

  // ── JSON hidden inputs ────────────────────────────────────────────
  let audienceDefinition = AUDIENCE_ALL;
  const audienceRaw = readString('audienceDefinitionJson');
  if (audienceRaw) {
    try {
      const parsed = AudienceDefinition.safeParse(JSON.parse(audienceRaw));
      if (parsed.success) audienceDefinition = parsed.data;
    } catch {
      /* fall back to All — Edge Function re-validates */
    }
  }

  let programItems: ProgramItemInput[] = [];
  const programItemsRaw = readString('programItemsJson');
  if (programItemsRaw) {
    try {
      const parsed = JSON.parse(programItemsRaw);
      if (Array.isArray(parsed)) {
        programItems = parsed
          .filter(
            (p): p is ProgramItemInput =>
              p &&
              typeof p === 'object' &&
              typeof p.startsAt === 'string' &&
              typeof p.title === 'string',
          )
          .map((p, idx) => ({
            startsAt: p.startsAt,
            title: p.title.trim(),
            detail: p.detail ? String(p.detail).trim() : null,
            sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : idx,
          }))
          .filter((p) => p.title.length > 0);
      }
    } catch {
      /* no program items */
    }
  }

  let types: EventType[] = [];
  const typesRaw = readString('typesJson');
  if (typesRaw) {
    try {
      const parsed = JSON.parse(typesRaw);
      if (Array.isArray(parsed)) {
        const allowed = new Set(EVENT_TYPES);
        types = parsed.filter(
          (t): t is EventType => typeof t === 'string' && allowed.has(t as EventType),
        );
      }
    } catch {
      /* no types */
    }
  }

  let advertImageUrls: string[] = [];
  const advertImagesRaw = readString('advertImageUrlsJson');
  if (advertImagesRaw) {
    try {
      const parsed = JSON.parse(advertImagesRaw);
      if (Array.isArray(parsed)) {
        advertImageUrls = parsed.filter((s): s is string => typeof s === 'string' && s.length > 0);
      }
    } catch {
      /* no images */
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      values: { ownerScopeId, name, description, startAt, endAt },
    };
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('events/create', {
    body: {
      ownerScopeId,
      name,
      description,
      types,
      advertImageUrls,
      startAt,
      endAt,
      timezone,
      venueName,
      venueAddress,
      venueMapUrl,
      onlineUrl,
      audienceDefinition,
      rsvpEnabled,
      contributionChargeId,
      reminderCadence,
      reminderStartAt,
      reminderCustomMessage,
      scheduledPublishAt,
      programItems,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create the event.'),
      values: { ownerScopeId, name, description, startAt, endAt },
    };
  }

  const id = extractId(data);

  if (intent === 'publish' && id) {
    const publishRes = await supabase.functions.invoke('events/publish', { body: { id } });
    if (publishRes.error) {
      return {
        ok: false,
        message: await extractInvokeMessage(
          publishRes.error,
          'Event saved as draft, but publish failed. Try Publish from the list.',
        ),
        values: { ownerScopeId, name, description, startAt, endAt },
      };
    }
    revalidatePath('/exco/events');
    return { ok: true, id, published: true };
  }

  revalidatePath('/exco/events');
  return { ok: true, id: id ?? undefined };
}

function extractId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as { id?: unknown; data?: { id?: unknown } };
  const nested = rec.data?.id;
  const flat = rec.id;
  return typeof nested === 'string' ? nested : typeof flat === 'string' ? flat : null;
}

// ─── updateEvent — the edit-page submit action ───────────────────────
//
// PATCH-style update against events/update. Program items get sent as
// a replace-all set (the Edge Function deletes existing children and
// inserts the new list in the same transaction). Ownership scope is
// intentionally omitted — an event's owner is fixed at creation.
export async function updateEvent(
  id: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const readString = (k: string) => {
    const raw = formData.get(k);
    return typeof raw === 'string' ? raw.trim() : '';
  };
  const readNullableString = (k: string) => {
    const s = readString(k);
    return s === '' ? null : s;
  };

  const name = readString('name');
  const description = readString('description');
  const timezone = readString('timezone') || 'UTC';

  const startAt = readString('startAt');
  const endAt = readString('endAt');

  const venueName = readNullableString('venueName');
  const venueAddress = readNullableString('venueAddress');
  const venueMapUrl = readNullableString('venueMapUrl');
  const onlineUrl = readNullableString('onlineUrl');

  const rsvpEnabled = formData.get('rsvpEnabled') === 'on';
  const scheduledPublishAtRaw = readString('scheduledPublishAt');
  const intent = readString('intent') as 'draft' | 'schedule' | '';

  const reminderCadenceRaw = readString('reminderCadence');
  const reminderCadence =
    reminderCadenceRaw === 'weekly' ||
    reminderCadenceRaw === 'biweekly' ||
    reminderCadenceRaw === 'monthly'
      ? reminderCadenceRaw
      : null;
  const reminderStartAt = readNullableString('reminderStartAt');
  const reminderCustomMessage = readNullableString('reminderCustomMessage');

  const fieldErrors: Partial<Record<EventFormField, string>> = {};
  if (!name) fieldErrors.name = 'Event name is required.';
  else if (name.length > 200) fieldErrors.name = 'Event name must be under 200 characters.';
  if (!startAt) fieldErrors.startAt = 'Start date and time are required.';
  if (!endAt) fieldErrors.endAt = 'End date and time are required.';
  if (startAt && endAt && new Date(endAt).getTime() < new Date(startAt).getTime()) {
    fieldErrors.endAt = 'End must be on or after start.';
  }
  if (!venueName && !onlineUrl) {
    fieldErrors.venue = 'At least one of Venue or Online URL is required.';
  }

  let scheduledPublishAt: string | null = null;
  if (intent === 'schedule') {
    if (!scheduledPublishAtRaw) {
      fieldErrors.scheduledPublishAt = 'Pick a date and time to schedule for.';
    } else {
      const when = new Date(scheduledPublishAtRaw);
      if (Number.isNaN(when.getTime())) {
        fieldErrors.scheduledPublishAt = 'Invalid schedule time.';
      } else if (when.getTime() <= Date.now()) {
        fieldErrors.scheduledPublishAt = 'Schedule time must be in the future.';
      } else {
        scheduledPublishAt = when.toISOString();
      }
    }
  }

  let audienceDefinition = AUDIENCE_ALL;
  const audienceRaw = readString('audienceDefinitionJson');
  if (audienceRaw) {
    try {
      const parsed = AudienceDefinition.safeParse(JSON.parse(audienceRaw));
      if (parsed.success) audienceDefinition = parsed.data;
    } catch {
      /* fall back to All */
    }
  }

  let programItems: ProgramItemInput[] = [];
  const programItemsRaw = readString('programItemsJson');
  if (programItemsRaw) {
    try {
      const parsed = JSON.parse(programItemsRaw);
      if (Array.isArray(parsed)) {
        programItems = parsed
          .filter(
            (p): p is ProgramItemInput =>
              p &&
              typeof p === 'object' &&
              typeof p.startsAt === 'string' &&
              typeof p.title === 'string',
          )
          .map((p, idx) => ({
            startsAt: p.startsAt,
            title: p.title.trim(),
            detail: p.detail ? String(p.detail).trim() : null,
            sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : idx,
          }))
          .filter((p) => p.title.length > 0);
      }
    } catch {
      /* no program items */
    }
  }

  let types: EventType[] = [];
  const typesRaw = readString('typesJson');
  if (typesRaw) {
    try {
      const parsed = JSON.parse(typesRaw);
      if (Array.isArray(parsed)) {
        const allowed = new Set(EVENT_TYPES);
        types = parsed.filter(
          (t): t is EventType => typeof t === 'string' && allowed.has(t as EventType),
        );
      }
    } catch {
      /* no types */
    }
  }

  let advertImageUrls: string[] = [];
  const advertImagesRaw = readString('advertImageUrlsJson');
  if (advertImagesRaw) {
    try {
      const parsed = JSON.parse(advertImagesRaw);
      if (Array.isArray(parsed)) {
        advertImageUrls = parsed.filter((s): s is string => typeof s === 'string' && s.length > 0);
      }
    } catch {
      /* no images */
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      values: { name, description, startAt, endAt },
    };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('events/update', {
    body: {
      id,
      name,
      description,
      types,
      advertImageUrls,
      startAt,
      endAt,
      timezone,
      venueName,
      venueAddress,
      venueMapUrl,
      onlineUrl,
      audienceDefinition,
      rsvpEnabled,
      reminderCadence,
      reminderStartAt,
      reminderCustomMessage,
      // Only send scheduledPublishAt when the caller is genuinely
      // (re-)scheduling. Omitting it leaves the row's current schedule
      // and status alone — critical for published rows so a plain
      // field edit doesn't accidentally knock them back to draft.
      ...(intent === 'schedule' && scheduledPublishAt ? { scheduledPublishAt } : {}),
      programItems,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not save the event.'),
      values: { name, description, startAt, endAt },
    };
  }

  revalidatePath('/exco/events');
  revalidatePath(`/exco/events/${id}`);
  return { ok: true, id };
}

// ─── Image upload ────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the bucket file_size_limit

/**
 * Upload a single advert image for an event. Called from the
 * EventImagesPicker's onChange. Returns a public CDN URL the form
 * embeds into the hidden `advertImageUrlsJson` payload.
 *
 * Auth model: the caller must be signed in (getServerClient reads
 * the session cookie). Beyond that, uploads land in an
 * uploader-scoped folder in the public `event-advert-images` bucket
 * — the caller can only overwrite their own path. When we wire the
 * events/create Edge Function to associate images to a specific
 * event, unreferenced uploads become reap candidates for a
 * scheduled cleanup job.
 */
export async function uploadEventAdvertImage(
  formData: FormData,
): Promise<{ ok: true; url: string; path: string } | { ok: false; message: string }> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, message: 'No file supplied.' };
  if (file.size === 0) return { ok: false, message: 'File is empty.' };
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: 'Image must be under 5 MB.' };
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      ok: false,
      message: `Unsupported file type "${file.type}". Use JPEG, PNG, WebP, or AVIF.`,
    };
  }

  // Path convention: {user_id}/{timestamp}-{sanitized-name}
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
  const path = `${user.id}/${Date.now()}-${cleanName}`;

  const serviceClient = createServiceRoleClient();
  const { error: upErr } = await serviceClient.storage
    .from('event-advert-images')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (upErr) {
    return {
      ok: false,
      message: upErr.message ?? 'Could not upload the image.',
    };
  }

  // Build the URL from the client-facing base rather than the
  // Storage SDK's getPublicUrl. In local Docker dev the admin server
  // reaches Supabase over an internal hostname (host.docker.internal),
  // and getPublicUrl would bake that into the URL — unreachable from
  // the browser. NEXT_PUBLIC_SUPABASE_URL is always the browser-facing
  // origin, on every environment.
  const publicBase = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, '');
  const url = `${publicBase}/storage/v1/object/public/event-advert-images/${path}`;
  return { ok: true, url, path };
}

'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

import type { EventFormState } from './event-form-types';
import {
  extractId,
  parseAdvertImagesJson,
  parseAudienceJson,
  parseProgramItemsJson,
  parseReminderCadence,
  parseTypesJson,
  readNullableString,
  readString,
  validateCoreEventFields,
  validateScheduledPublishAt,
} from './event-form-parser';

export type { EventFormState } from './event-form-types';

/**
 * Server Actions for exco.events — the envelope layer per ADR-0033.
 * All mutations go through the events/* Edge Functions. Form-parsing
 * helpers live in event-form-parser.ts; the image upload action lives
 * in event-image-actions.ts.
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

// ─── createEvent — the form's submit action ──────────────────────────

/**
 * Create an event. Reads FormData; intent (draft / schedule / publish)
 * comes from the named submit button. The Edge Function validates
 * fully with Zod; this action does light shape work + intent routing.
 */
export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const ownerScopeId = readString(formData, 'ownerScopeId');
  const name = readString(formData, 'name');
  const description = readString(formData, 'description');
  const timezone = readString(formData, 'timezone') || 'UTC';
  const startAt = readString(formData, 'startAt');
  const endAt = readString(formData, 'endAt');
  const venueName = readNullableString(formData, 'venueName');
  const venueAddress = readNullableString(formData, 'venueAddress');
  const venueMapUrl = readNullableString(formData, 'venueMapUrl');
  const onlineUrl = readNullableString(formData, 'onlineUrl');
  const rsvpEnabled = formData.get('rsvpEnabled') === 'on';
  const scheduledPublishAtRaw = readString(formData, 'scheduledPublishAt');
  const intent = readString(formData, 'intent') as 'draft' | 'schedule' | 'publish' | '';
  const reminderCadence = parseReminderCadence(readString(formData, 'reminderCadence'));
  const reminderStartAt = readNullableString(formData, 'reminderStartAt');
  const reminderCustomMessage = readNullableString(formData, 'reminderCustomMessage');
  const contributionChargeId = readNullableString(formData, 'contributionChargeId');

  const fieldErrors = validateCoreEventFields({ name, startAt, endAt, venueName, onlineUrl });
  if (!ownerScopeId) fieldErrors.ownerScopeId = 'Pick a scope to publish under.';

  const scheduledPublishAt =
    intent === 'schedule' ? validateScheduledPublishAt(scheduledPublishAtRaw, fieldErrors) : null;

  const audienceDefinition = parseAudienceJson(readString(formData, 'audienceDefinitionJson'));
  const programItems = parseProgramItemsJson(readString(formData, 'programItemsJson'));
  const types = parseTypesJson(readString(formData, 'typesJson'));
  const advertImageUrls = parseAdvertImagesJson(readString(formData, 'advertImageUrlsJson'));

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
  const name = readString(formData, 'name');
  const description = readString(formData, 'description');
  const timezone = readString(formData, 'timezone') || 'UTC';
  const startAt = readString(formData, 'startAt');
  const endAt = readString(formData, 'endAt');
  const venueName = readNullableString(formData, 'venueName');
  const venueAddress = readNullableString(formData, 'venueAddress');
  const venueMapUrl = readNullableString(formData, 'venueMapUrl');
  const onlineUrl = readNullableString(formData, 'onlineUrl');
  const rsvpEnabled = formData.get('rsvpEnabled') === 'on';
  const scheduledPublishAtRaw = readString(formData, 'scheduledPublishAt');
  const intent = readString(formData, 'intent') as 'draft' | 'schedule' | '';
  const reminderCadence = parseReminderCadence(readString(formData, 'reminderCadence'));
  const reminderStartAt = readNullableString(formData, 'reminderStartAt');
  const reminderCustomMessage = readNullableString(formData, 'reminderCustomMessage');

  const fieldErrors = validateCoreEventFields({ name, startAt, endAt, venueName, onlineUrl });
  const scheduledPublishAt =
    intent === 'schedule' ? validateScheduledPublishAt(scheduledPublishAtRaw, fieldErrors) : null;

  const audienceDefinition = parseAudienceJson(readString(formData, 'audienceDefinitionJson'));
  const programItems = parseProgramItemsJson(readString(formData, 'programItemsJson'));
  const types = parseTypesJson(readString(formData, 'typesJson'));
  const advertImageUrls = parseAdvertImagesJson(readString(formData, 'advertImageUrlsJson'));

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

import { AUDIENCE_ALL, AudienceDefinition } from '@shesa/domain/audience';

import {
  EVENT_TYPES,
  type EventFormField,
  type EventType,
  type ProgramItemInput,
  type ReminderCadence,
} from './event-form-types';

/**
 * Pure parsing + validation helpers shared by createEvent and
 * updateEvent. Kept out of the 'use server' actions.ts file so
 * unit-testing them doesn't require the Next runtime.
 */

export function readString(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === 'string' ? raw.trim() : '';
}

export function readNullableString(formData: FormData, key: string): string | null {
  const s = readString(formData, key);
  return s === '' ? null : s;
}

export function parseReminderCadence(raw: string): ReminderCadence {
  return raw === 'weekly' || raw === 'biweekly' || raw === 'monthly' ? raw : null;
}

/**
 * Parse the audience JSON hidden input. Falls back to AUDIENCE_ALL when
 * the payload is missing or fails schema validation — the Edge Function
 * re-validates on the server side either way.
 */
export function parseAudienceJson(raw: string) {
  if (!raw) return AUDIENCE_ALL;
  try {
    const parsed = AudienceDefinition.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {
    /* fall through */
  }
  return AUDIENCE_ALL;
}

/**
 * Parse the program items JSON hidden input. Empty on error / missing.
 */
export function parseProgramItemsJson(raw: string): ProgramItemInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
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
  } catch {
    return [];
  }
}

/**
 * Parse the event types JSON hidden input, filtering to known values.
 */
export function parseTypesJson(raw: string): EventType[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set<string>(EVENT_TYPES);
    return parsed.filter((t): t is EventType => typeof t === 'string' && allowed.has(t));
  } catch {
    return [];
  }
}

/**
 * Parse the advert image URLs JSON hidden input.
 */
export function parseAdvertImagesJson(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string' && s.length > 0);
  } catch {
    return [];
  }
}

interface CoreFieldsInput {
  readonly name: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly venueName: string | null;
  readonly onlineUrl: string | null;
}

/**
 * Cross-field validation for the name / dates / venue trio shared by
 * create + update. Callers add their own scope-specific checks
 * (ownerScopeId on create, scheduling window, etc).
 */
export function validateCoreEventFields(
  input: CoreFieldsInput,
): Partial<Record<EventFormField, string>> {
  const fieldErrors: Partial<Record<EventFormField, string>> = {};
  if (!input.name) fieldErrors.name = 'Event name is required.';
  else if (input.name.length > 200) fieldErrors.name = 'Event name must be under 200 characters.';
  if (!input.startAt) fieldErrors.startAt = 'Start date and time are required.';
  if (!input.endAt) fieldErrors.endAt = 'End date and time are required.';
  if (
    input.startAt &&
    input.endAt &&
    new Date(input.endAt).getTime() < new Date(input.startAt).getTime()
  ) {
    fieldErrors.endAt = 'End must be on or after start.';
  }
  if (!input.venueName && !input.onlineUrl) {
    fieldErrors.venue = 'At least one of Venue or Online URL is required.';
  }
  return fieldErrors;
}

/**
 * Validate the scheduled-publish-at input and either return the ISO
 * string (when valid) or write an error into the fieldErrors bag.
 * Returns null when scheduling is not requested.
 */
export function validateScheduledPublishAt(
  raw: string,
  fieldErrors: Partial<Record<EventFormField, string>>,
): string | null {
  if (!raw) {
    fieldErrors.scheduledPublishAt = 'Pick a date and time to schedule for.';
    return null;
  }
  const when = new Date(raw);
  if (Number.isNaN(when.getTime())) {
    fieldErrors.scheduledPublishAt = 'Invalid schedule time.';
    return null;
  }
  if (when.getTime() <= Date.now()) {
    fieldErrors.scheduledPublishAt = 'Schedule time must be in the future.';
    return null;
  }
  return when.toISOString();
}

/**
 * Read the `id` field out of the Edge Function's response envelope.
 * Some functions nest data one level, others return it flat.
 */
export function extractId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const rec = data as { id?: unknown; data?: { id?: unknown } };
  const nested = rec.data?.id;
  const flat = rec.id;
  return typeof nested === 'string' ? nested : typeof flat === 'string' ? flat : null;
}

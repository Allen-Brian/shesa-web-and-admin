export type EventFormField =
  'ownerScopeId' | 'name' | 'description' | 'startAt' | 'endAt' | 'scheduledPublishAt' | 'venue';

export type EventFormState =
  | { ok: true; id?: string; published?: boolean }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<EventFormField, string>>;
      values?: Partial<Record<EventFormField, string>>;
    };

export const EVENT_TYPES = [
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

export type EventType = (typeof EVENT_TYPES)[number];

export interface ProgramItemInput {
  readonly startsAt: string;
  readonly title: string;
  readonly detail?: string | null;
  readonly sortOrder?: number;
}

export type ReminderCadence = 'weekly' | 'biweekly' | 'monthly' | null;

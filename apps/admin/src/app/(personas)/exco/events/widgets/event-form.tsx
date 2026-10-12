'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useActionState } from 'react';

import { Label, toast } from '@shesa/ui';

import type { AudienceDefinition } from '@shesa/domain/audience';

import { type AudienceOptions } from '@/components/audience/audience-selector';
import { QuillEditor } from '@/components/rich-editor/quill-editor';

import { createEvent, updateEvent, type EventFormState } from '../event-actions';
import { EventAudienceCard } from './event-audience-card';
import { EventImagesCard } from './event-images-card';
import { EventProgramCard } from './event-program-card';
import { EventPublicationSettingsCard } from './event-publication-settings-card';
import { EventRemindersCard } from './event-reminders-card';
import { EventScheduleVenueCard } from './event-schedule-venue-card';
import {
  combineDateTime,
  isoToDate,
  isoToTime,
  newProgramItemId,
  normalizeProgramTime,
} from './event-form-helpers';
import type { EventTypeValue } from './event-types-catalog';
import { type ProgramItem } from './program-item-card';

// ─── Props / types ──────────────────────────────────────────────────

export interface OwnerScopeOption {
  readonly id: string;
  readonly name: string;
  readonly scopeType: string;
}

export interface EventInitialProgramItem {
  readonly startsAt: string; // "HH:mm" or "HH:mm:ss"
  readonly title: string;
  readonly detail: string | null;
}

export interface EventInitialValues {
  readonly id: string;
  readonly ownerScopeId: string;
  readonly name: string;
  readonly description: string;
  readonly types: readonly EventTypeValue[];
  readonly startAt: string; // ISO
  readonly endAt: string; // ISO
  readonly timezone: string;
  readonly venueName: string | null;
  readonly venueAddress: string | null;
  readonly venueMapUrl: string | null;
  readonly onlineUrl: string | null;
  readonly advertImageUrls: readonly string[];
  readonly rsvpEnabled: boolean;
  readonly reminderCadence: 'weekly' | 'biweekly' | 'monthly' | null;
  readonly reminderStartAt: string | null; // ISO
  readonly reminderCustomMessage: string | null;
  readonly scheduledPublishAt: string | null; // ISO
  readonly status: string;
  readonly programItems: readonly EventInitialProgramItem[];
  readonly audienceDefinition: AudienceDefinition | null;
}

interface EventFormProps {
  readonly ownerScopes: readonly OwnerScopeOption[];
  readonly audienceOptions: AudienceOptions;
  readonly mode?: 'create' | 'edit';
  readonly initial?: EventInitialValues;
}

const initialState: EventFormState = { ok: false };

/**
 * Events create / edit form.
 *
 * Owns all state slices (schedule, venue, RSVP, event types, reminders,
 * scheduling, program items, ownerScopeId) so cross-card derivations
 * stay coherent — the `derivedMode` badge in the Schedule & Venue card,
 * for instance, is a function of both venueName and onlineUrl.
 *
 * Cards receive the state slices + setters they need as props. Hidden
 * inputs live either inside the card that owns the value (venue, dates,
 * RSVP, reminderCadence) or here at the form root when they carry
 * cross-card payloads (programItemsJson, typesJson).
 */
export function EventForm({
  ownerScopes,
  audienceOptions,
  mode = 'create',
  initial,
}: EventFormProps) {
  const router = useRouter();
  const isEdit = mode === 'edit' && !!initial;

  const boundAction = isEdit
    ? (state: EventFormState, formData: FormData) => updateEvent(initial!.id, state, formData)
    : createEvent;

  const [state, formAction] = useActionState(boundAction, initialState);
  const [, startTransition] = useTransition();

  const [ownerScopeId, setOwnerScopeId] = useState<string>(
    (!state.ok && state.values?.ownerScopeId) || initial?.ownerScopeId || ownerScopes[0]?.id || '',
  );

  // Schedule fields — derive from initial ISO values.
  const [startDate, setStartDate] = useState(() => isoToDate(initial?.startAt));
  const [startTime, setStartTime] = useState(() => isoToTime(initial?.startAt));
  const [endDate, setEndDate] = useState(() => isoToDate(initial?.endAt));
  const [endTime, setEndTime] = useState(() => isoToTime(initial?.endAt));
  const [timezone, setTimezone] = useState<string>(() => {
    if (initial?.timezone) return initial.timezone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });
  const [venueName, setVenueName] = useState(initial?.venueName ?? '');
  const [venueAddress, setVenueAddress] = useState(initial?.venueAddress ?? '');
  const [venueMapUrl, setVenueMapUrl] = useState(initial?.venueMapUrl ?? '');
  const [onlineUrl, setOnlineUrl] = useState(initial?.onlineUrl ?? '');

  const startAtIso = useMemo(() => combineDateTime(startDate, startTime), [startDate, startTime]);
  const endAtIso = useMemo(() => combineDateTime(endDate, endTime), [endDate, endTime]);

  const derivedMode: 'physical' | 'online' | 'hybrid' | 'unset' = useMemo(() => {
    const hasVenue = Boolean(venueName.trim());
    const hasOnline = Boolean(onlineUrl.trim());
    if (hasVenue && hasOnline) return 'hybrid';
    if (hasOnline) return 'online';
    if (hasVenue) return 'physical';
    return 'unset';
  }, [venueName, onlineUrl]);

  // Types multi-select
  const [selectedTypes, setSelectedTypes] = useState<readonly EventTypeValue[]>(
    initial?.types ?? [],
  );
  const typesJson = useMemo(() => JSON.stringify(selectedTypes), [selectedTypes]);
  const toggleType = (v: EventTypeValue) =>
    setSelectedTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  const removeType = (v: EventTypeValue) => setSelectedTypes((prev) => prev.filter((x) => x !== v));

  // RSVP
  const [rsvpEnabled, setRsvpEnabled] = useState(initial?.rsvpEnabled ?? false);

  // Reminders
  const [reminderCadence, setReminderCadence] = useState<
    'none' | 'weekly' | 'biweekly' | 'monthly'
  >(initial?.reminderCadence ?? 'none');
  const [reminderStartDate, setReminderStartDate] = useState(() =>
    isoToDate(initial?.reminderStartAt),
  );
  const [reminderStartTime, setReminderStartTime] = useState(() =>
    isoToTime(initial?.reminderStartAt),
  );
  const [reminderCustomMessage, setReminderCustomMessage] = useState(
    initial?.reminderCustomMessage ?? '',
  );
  const reminderStartAtIso = useMemo(
    () => combineDateTime(reminderStartDate, reminderStartTime),
    [reminderStartDate, reminderStartTime],
  );

  // Publication scheduling
  const [isScheduling, setIsScheduling] = useState(!!initial?.scheduledPublishAt);
  const [scheduleDate, setScheduleDate] = useState(() => isoToDate(initial?.scheduledPublishAt));
  const [scheduleTime, setScheduleTime] = useState(() => isoToTime(initial?.scheduledPublishAt));
  const scheduledPublishAtIso = useMemo(
    () => (isScheduling ? combineDateTime(scheduleDate, scheduleTime) : ''),
    [isScheduling, scheduleDate, scheduleTime],
  );

  // Program items
  const [programItems, setProgramItems] = useState<readonly ProgramItem[]>(() =>
    (initial?.programItems ?? []).map((p) => ({
      id: newProgramItemId(),
      startsAt: normalizeProgramTime(p.startsAt),
      title: p.title,
      detail: p.detail ?? '',
    })),
  );
  const programItemsJson = useMemo(
    () =>
      JSON.stringify(
        programItems.map((p, idx) => ({
          startsAt: p.startsAt,
          title: p.title,
          detail: p.detail || null,
          sortOrder: idx,
        })),
      ),
    [programItems],
  );
  const addProgramItem = () =>
    setProgramItems((prev) => [
      ...prev,
      { id: newProgramItemId(), startsAt: '', title: '', detail: '' },
    ]);
  const updateProgramItem = (id: string, patch: Partial<Omit<ProgramItem, 'id'>>) =>
    setProgramItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removeProgramItem = (id: string) =>
    setProgramItems((prev) => prev.filter((p) => p.id !== id));
  const moveProgramItem = (id: string, delta: -1 | 1) =>
    setProgramItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const target = idx + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item!);
      return next;
    });

  useEffect(() => {
    if (state.ok) {
      if (isEdit) toast.success('Event saved.');
      else toast.success(state.published ? 'Event published.' : 'Event saved as draft.');
      if (state.id) startTransition(() => router.push('/exco/events'));
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router, isEdit]);

  const fieldErrors = (!state.ok && state.fieldErrors) || {};
  const values = (!state.ok && state.values) || {};
  const nameDefault = values.name ?? initial?.name ?? '';
  const descriptionDefault = values.description ?? initial?.description ?? '';

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
        {/* ═══ Central column ═══════════════════════════════ */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Label htmlFor="name" className="sr-only">
            Event name
          </Label>
          <input
            id="name"
            name="name"
            type="text"
            className="w-full border-0 bg-transparent px-0 py-1 text-3xl font-semibold text-foreground placeholder:text-muted-foreground focus:border-0 focus:outline-none focus-visible:outline-none"
            style={{ boxShadow: 'none' }}
            placeholder="Event name"
            defaultValue={nameDefault}
            required
            maxLength={200}
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}

          <EventScheduleVenueCard
            startDate={startDate}
            startTime={startTime}
            endDate={endDate}
            endTime={endTime}
            startAtIso={startAtIso}
            endAtIso={endAtIso}
            timezone={timezone}
            venueName={venueName}
            venueAddress={venueAddress}
            venueMapUrl={venueMapUrl}
            onlineUrl={onlineUrl}
            derivedMode={derivedMode}
            selectedTypes={selectedTypes}
            rsvpEnabled={rsvpEnabled}
            fieldErrors={fieldErrors}
            onStartDateChange={setStartDate}
            onStartTimeChange={setStartTime}
            onEndDateChange={setEndDate}
            onEndTimeChange={setEndTime}
            onTimezoneChange={setTimezone}
            onVenueNameChange={setVenueName}
            onVenueAddressChange={setVenueAddress}
            onVenueMapUrlChange={setVenueMapUrl}
            onOnlineUrlChange={setOnlineUrl}
            onToggleType={toggleType}
            onRemoveType={removeType}
            onRsvpEnabledChange={setRsvpEnabled}
          />

          <EventImagesCard initialUrls={initial?.advertImageUrls ?? []} />

          {/* Rich editor — same shape as Announcements, shorter body */}
          <div>
            <Label htmlFor="description" className="sr-only">
              Description
            </Label>
            <QuillEditor
              name="description"
              initialValue={descriptionDefault}
              placeholder="Describe the event — what it's about, why it matters, what to expect."
              minHeight={320}
              className="border border-input bg-card rounded-lg p-2"
            />
          </div>

          <EventProgramCard
            items={programItems}
            onAdd={addProgramItem}
            onUpdate={updateProgramItem}
            onMove={moveProgramItem}
            onRemove={removeProgramItem}
          />

          {!state.ok && state.message && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          )}
        </div>

        {/* ═══ Sidebar ═══════════════════════════════════════ */}
        <aside className="no-scrollbar flex w-full flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-95 lg:shrink-0 lg:overflow-y-auto">
          <EventPublicationSettingsCard
            ownerScopes={ownerScopes}
            ownerScopeId={ownerScopeId}
            onOwnerScopeIdChange={setOwnerScopeId}
            isEdit={isEdit}
            isScheduling={isScheduling}
            onIsSchedulingChange={setIsScheduling}
            scheduleDate={scheduleDate}
            scheduleTime={scheduleTime}
            onScheduleDateChange={setScheduleDate}
            onScheduleTimeChange={setScheduleTime}
            scheduledPublishAtIso={scheduledPublishAtIso}
            fieldErrors={fieldErrors}
          />

          <EventRemindersCard
            cadence={reminderCadence}
            onCadenceChange={setReminderCadence}
            startDate={reminderStartDate}
            startTime={reminderStartTime}
            onStartDateChange={setReminderStartDate}
            onStartTimeChange={setReminderStartTime}
            reminderStartAtIso={reminderStartAtIso}
            customMessage={reminderCustomMessage}
            onCustomMessageChange={setReminderCustomMessage}
          />

          <EventAudienceCard
            ownerScopeId={ownerScopeId}
            options={audienceOptions}
            initialAudience={initial?.audienceDefinition ?? undefined}
          />
        </aside>
      </div>

      {/* Hidden bulk-JSON payloads for cross-card values */}
      <input type="hidden" name="programItemsJson" value={programItemsJson} />
      <input type="hidden" name="typesJson" value={typesJson} />
    </form>
  );
}

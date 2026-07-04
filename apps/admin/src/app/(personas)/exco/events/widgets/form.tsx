'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2, X } from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DatePicker,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
  TimePicker,
  toast,
} from '@shesa/ui';

import type { AudienceDefinition } from '@shesa/domain/audience';

import { AudienceSelector, type AudienceOptions } from '@/components/audience/audience-selector';
import { EventImagesPicker } from '@/components/image-picker/event-images-picker';
import { QuillEditor } from '@/components/rich-editor/quill-editor';

import { createEvent, updateEvent, type EventFormState } from '../actions';

// ─── Event types catalog ────────────────────────────────────────────

const EVENT_TYPES = [
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'assembly', label: 'Assembly (AGM / EGM)' },
  { value: 'networking', label: 'Networking' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'community_service', label: 'Community Service' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'training', label: 'Training' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' },
] as const;
type EventTypeValue = (typeof EVENT_TYPES)[number]['value'];

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

interface ProgramItem {
  readonly id: string;
  readonly startsAt: string; // "HH:mm"
  readonly title: string;
  readonly detail: string;
}

const initialState: EventFormState = { ok: false };

// ─── Helpers ────────────────────────────────────────────────────────

function combineDateTime(date: string, time: string): string {
  if (!date || !time) return '';
  const dt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString();
}

function isoToDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isoToTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeProgramTime(raw: string): string {
  // Backend stores TIME as "HH:mm:ss"; the form uses "HH:mm".
  if (!raw) return '';
  const parts = raw.split(':');
  const hh = parts[0] ?? '00';
  const mm = parts[1] ?? '00';
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
}

function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

// ─── Main form ──────────────────────────────────────────────────────

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
  const toggleType = (v: EventTypeValue) => {
    setSelectedTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };
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

  // Schedule swap
  const [isScheduling, setIsScheduling] = useState(!!initial?.scheduledPublishAt);
  const [scheduleDate, setScheduleDate] = useState(() => isoToDate(initial?.scheduledPublishAt));
  const [scheduleTime, setScheduleTime] = useState(() => isoToTime(initial?.scheduledPublishAt));
  const scheduledPublishAtIso = useMemo(
    () => (isScheduling ? combineDateTime(scheduleDate, scheduleTime) : ''),
    [isScheduling, scheduleDate, scheduleTime],
  );

  // Program items — hydrated from initial in edit mode.
  const [programItems, setProgramItems] = useState<readonly ProgramItem[]>(() =>
    (initial?.programItems ?? []).map((p) => ({
      id: newId(),
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
    setProgramItems((prev) => [...prev, { id: newId(), startsAt: '', title: '', detail: '' }]);
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
      if (isEdit) {
        toast.success('Event saved.');
      } else {
        toast.success(state.published ? 'Event published.' : 'Event saved as draft.');
      }
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
          {/* Title */}
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

          {/* Schedule & Venue (Event Type + RSVP live here) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Schedule &amp; Venue</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Start */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">Start date</Label>
                  <DatePicker value={startDate} onChange={setStartDate} placeholder="Pick a date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">Start time</Label>
                  <TimePicker value={startTime} onChange={setStartTime} placeholder="Pick a time" />
                </div>
              </div>
              <input type="hidden" name="startAt" value={startAtIso} />
              {fieldErrors.startAt && (
                <p className="text-xs text-destructive">{fieldErrors.startAt}</p>
              )}

              {/* End */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">End date</Label>
                  <DatePicker value={endDate} onChange={setEndDate} placeholder="Pick a date" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">End time</Label>
                  <TimePicker value={endTime} onChange={setEndTime} placeholder="Pick a time" />
                </div>
              </div>
              <input type="hidden" name="endAt" value={endAtIso} />
              {fieldErrors.endAt && <p className="text-xs text-destructive">{fieldErrors.endAt}</p>}

              {/* Timezone + Event Type — side by side on wide */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="timezone" className="text-sm">
                    Timezone (IANA)
                  </Label>
                  <Input
                    id="timezone"
                    name="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. Africa/Douala"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm">Event type</Label>
                  <EventTypeMultiSelect
                    selected={selectedTypes}
                    onToggle={toggleType}
                    onRemove={removeType}
                  />
                </div>
              </div>

              <Separator />

              {/* Venue block */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="venueName" className="text-sm">
                  Venue name
                </Label>
                <Input
                  id="venueName"
                  name="venueName"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Buea Community Hall"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="venueAddress" className="text-sm">
                    Venue address
                  </Label>
                  <Input
                    id="venueAddress"
                    name="venueAddress"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    placeholder="Street, city"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="venueMapUrl" className="text-sm">
                    Map URL (optional)
                  </Label>
                  <Input
                    id="venueMapUrl"
                    name="venueMapUrl"
                    value={venueMapUrl}
                    onChange={(e) => setVenueMapUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onlineUrl" className="text-sm">
                  Online URL (Zoom / Meet / YouTube)
                </Label>
                <Input
                  id="onlineUrl"
                  name="onlineUrl"
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>

              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                Mode:{' '}
                <span className="font-medium text-foreground">
                  {derivedMode === 'unset' ? 'Not set' : derivedMode}
                </span>
                {derivedMode === 'unset' && (
                  <span className="ml-1 text-muted-foreground">
                    (fill a venue OR an online URL)
                  </span>
                )}
              </div>
              {fieldErrors.venue && <p className="text-xs text-destructive">{fieldErrors.venue}</p>}

              <Separator />

              {/* RSVP toggle */}
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={rsvpEnabled}
                    onCheckedChange={(v) => setRsvpEnabled(v === true)}
                  />
                  <span>Enable RSVP (Interested / Going)</span>
                </label>
                {rsvpEnabled && <input type="hidden" name="rsvpEnabled" value="on" />}
              </div>
            </CardContent>
          </Card>

          {/* Banner & Images */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Banner &amp; Images</CardTitle>
              <p className="text-xs text-muted-foreground">
                The first image is the event's banner / hero cover; the rest are gallery slots on
                the detail page.
              </p>
            </CardHeader>
            <CardContent>
              <EventImagesPicker initialUrls={initial?.advertImageUrls ?? []} />
            </CardContent>
          </Card>

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

          {/* Program items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Program</CardTitle>
              <p className="text-xs text-muted-foreground">
                Structured agenda rendered as a timeline on the detail page.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {programItems.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                  <span>No agenda items yet.</span>
                  <span className="text-xs">
                    Add sessions like "Opening Remarks" or "Panel: Fintech in CM" with a time.
                  </span>
                </div>
              )}
              {programItems.map((item, idx) => (
                <ProgramItemCard
                  key={item.id}
                  index={idx}
                  total={programItems.length}
                  item={item}
                  onChange={(patch) => updateProgramItem(item.id, patch)}
                  onMove={(delta) => moveProgramItem(item.id, delta)}
                  onRemove={() => removeProgramItem(item.id)}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start gap-1"
                onClick={addProgramItem}
              >
                <Plus className="h-4 w-4" />
                Add program item
              </Button>
            </CardContent>
          </Card>

          {!state.ok && state.message && (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          )}
        </div>

        {/* ═══ Sidebar ═══════════════════════════════════════ */}
        <aside className="no-scrollbar flex w-full flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-95 lg:shrink-0 lg:overflow-y-auto">
          {/* Publication Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Publication Settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ownerScopeId" className="text-sm">
                  Publish under
                </Label>
                <Select value={ownerScopeId} onValueChange={setOwnerScopeId} disabled={isEdit}>
                  <SelectTrigger id="ownerScopeId" className="w-full">
                    <SelectValue placeholder="Select a scope" />
                  </SelectTrigger>
                  <SelectContent>
                    {ownerScopes.length === 0 && (
                      <SelectItem value="__none__" disabled>
                        No admin scopes
                      </SelectItem>
                    )}
                    {ownerScopes.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.scopeType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="ownerScopeId" value={ownerScopeId} />
                {isEdit && (
                  <p className="text-xs text-muted-foreground">
                    Ownership is set at creation and cannot be changed here.
                  </p>
                )}
                {fieldErrors.ownerScopeId && (
                  <p className="text-xs text-destructive">{fieldErrors.ownerScopeId}</p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={isScheduling}
                  onCheckedChange={(v) => setIsScheduling(v === true)}
                />
                <span>Schedule this event</span>
              </label>

              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isScheduling ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm">Publish on</Label>
                      <DatePicker
                        value={scheduleDate}
                        onChange={setScheduleDate}
                        placeholder="Pick a date"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm">At</Label>
                      <TimePicker
                        value={scheduleTime}
                        onChange={setScheduleTime}
                        placeholder="Pick a time"
                      />
                    </div>
                    <input type="hidden" name="scheduledPublishAt" value={scheduledPublishAtIso} />
                    {fieldErrors.scheduledPublishAt && (
                      <p className="text-xs text-destructive">{fieldErrors.scheduledPublishAt}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/exco/events')}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="outline" size="sm" name="intent" value="draft">
                  {isEdit ? 'Save Changes' : 'Save as Draft'}
                </Button>
                {isScheduling ? (
                  <Button
                    type="submit"
                    size="sm"
                    name="intent"
                    value="schedule"
                    disabled={!scheduledPublishAtIso}
                  >
                    Schedule
                  </Button>
                ) : (
                  !isEdit && (
                    <Button type="submit" size="sm" name="intent" value="publish">
                      Publish
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Reminders</CardTitle>
              <p className="text-xs text-muted-foreground">
                Reminder-announcements auto-emit on this cadence until the event date.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Cadence</Label>
                <Select
                  value={reminderCadence}
                  onValueChange={(v) =>
                    setReminderCadence(v as 'none' | 'weekly' | 'biweekly' | 'monthly')
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reminders</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                {reminderCadence !== 'none' && (
                  <input type="hidden" name="reminderCadence" value={reminderCadence} />
                )}
              </div>

              {reminderCadence !== 'none' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm">Start date</Label>
                      <DatePicker
                        value={reminderStartDate}
                        onChange={setReminderStartDate}
                        placeholder="Publish Date"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm">Start time</Label>
                      <TimePicker
                        value={reminderStartTime}
                        onChange={setReminderStartTime}
                        placeholder="Pick a time"
                      />
                    </div>
                  </div>
                  <input type="hidden" name="reminderStartAt" value={reminderStartAtIso} />

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reminderCustomMessage" className="text-sm">
                      Custom reminder message (optional)
                    </Label>
                    <Textarea
                      id="reminderCustomMessage"
                      name="reminderCustomMessage"
                      value={reminderCustomMessage}
                      onChange={(e) => setReminderCustomMessage(e.target.value)}
                      rows={2}
                      placeholder="Uses the event's own name/details by default."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Audience */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audience</CardTitle>
            </CardHeader>
            <CardContent>
              <AudienceSelector
                ownerScopeId={ownerScopeId}
                options={audienceOptions}
                initialAudience={initial?.audienceDefinition ?? undefined}
              />
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Hidden bulk-JSON payloads */}
      <input type="hidden" name="programItemsJson" value={programItemsJson} />
      <input type="hidden" name="typesJson" value={typesJson} />
    </form>
  );
}

// ─── Program item card ──────────────────────────────────────────────
//
// Each item lives in its own bordered card with a step-number badge
// on the top-left and a compact action row (up / down / remove) on
// the top-right. Time + title share a horizontal row; detail sits
// below as a slim, single-focus textarea.

interface ProgramItemCardProps {
  readonly index: number;
  readonly total: number;
  readonly item: ProgramItem;
  readonly onChange: (patch: Partial<Omit<ProgramItem, 'id'>>) => void;
  readonly onMove: (delta: -1 | 1) => void;
  readonly onRemove: () => void;
}

function ProgramItemCard({ index, total, item, onChange, onMove, onRemove }: ProgramItemCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card/50 p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <Input
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={`Item ${index + 1} — e.g. "Opening Remarks"`}
            maxLength={200}
            className="border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-[140px_1fr] gap-2">
        <TimePicker
          value={item.startsAt}
          onChange={(v) => onChange({ startsAt: v })}
          placeholder="Time"
        />
        <Textarea
          value={item.detail}
          onChange={(e) => onChange({ detail: e.target.value })}
          placeholder="Optional details for this session"
          rows={1}
          className="min-h-9 resize-none text-sm"
        />
      </div>
    </div>
  );
}

// ─── Event Type multi-select ────────────────────────────────────────
//
// Uses a plain button styled to match SelectTrigger exactly (same
// classes) so it visually reads as a shadcn Select. Clicking opens a
// Popover with a scrollable list of Checkbox items. Selected values
// render as removable Badges below the trigger — same UX we use in
// the audience selector.

interface EventTypeMultiSelectProps {
  readonly selected: readonly EventTypeValue[];
  readonly onToggle: (v: EventTypeValue) => void;
  readonly onRemove: (v: EventTypeValue) => void;
}

const SELECT_TRIGGER_CLASS =
  'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-(--input-border) bg-transparent px-[11px] py-2 text-sm text-foreground ' +
  'transition-[border-color,box-shadow] hover:border-(--input-border-hover) ' +
  'focus:outline-none focus:border-(--input-border-hover) focus:shadow-(--input-focus-shadow) ' +
  'data-[state=open]:border-(--input-border-hover) data-[state=open]:shadow-(--input-focus-shadow)';

function EventTypeMultiSelect({ selected, onToggle, onRemove }: EventTypeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const label =
    selected.length === 0
      ? 'Select event types…'
      : selected.length === 1
        ? (EVENT_TYPES.find((t) => t.value === selected[0])?.label ?? '1 selected')
        : `${selected.length} types selected`;
  const isEmpty = selected.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={SELECT_TRIGGER_CLASS}>
            <span className={isEmpty ? 'text-muted-foreground' : ''}>{label}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-72 w-[--radix-popover-trigger-width] overflow-y-auto p-1"
        >
          <ul className="flex flex-col gap-0.5">
            {EVENT_TYPES.map((t) => {
              const active = selected.includes(t.value);
              return (
                <li key={t.value}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox checked={active} onCheckedChange={() => onToggle(t.value)} />
                    <span>{t.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((v) => {
            const t = EVENT_TYPES.find((x) => x.value === v);
            return (
              <Badge key={v} variant="secondary" className="gap-1 pr-1 text-xs">
                <span>{t?.label ?? v}</span>
                <button
                  type="button"
                  onClick={() => onRemove(v)}
                  className="rounded-sm p-0.5 hover:bg-background"
                  aria-label={`Remove ${t?.label ?? v}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

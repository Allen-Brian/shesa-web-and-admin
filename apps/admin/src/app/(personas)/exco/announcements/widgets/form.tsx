'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useActionState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DatePicker,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TimePicker,
  toast,
} from '@shesa/ui';

import { AudienceSelector, type AudienceOptions } from '@/components/audience/audience-selector';
import { QuillEditor } from '@/components/rich-editor/quill-editor';

import { createAnnouncement, type AnnouncementFormState } from '../actions';

export interface OwnerScopeOption {
  readonly id: string;
  readonly name: string;
  readonly scopeType: string;
}

interface AnnouncementFormProps {
  readonly ownerScopes: readonly OwnerScopeOption[];
  readonly audienceOptions: AudienceOptions;
}

const initialState: AnnouncementFormState = { ok: false };

/**
 * Announcement create form.
 *
 * Layout:
 *   - Main column (left): title + Quill rich editor.
 *   - Sidebar (right, scrollable within viewport, scrollbar hidden):
 *     Publication Settings — owner scope, channels, an optional
 *     "Schedule this announcement" toggle that smoothly reveals a
 *     DatePicker + time input + recurrence, and the action row
 *     (Cancel / Save Draft / Publish OR Schedule).
 *   - Audience card sits below Publication Settings inside the same
 *     scrollable sidebar.
 *
 * Recurrence UI ships as a UX stub — backend column shape lands with
 * the events reminder engine; the values are collected but not sent
 * to the current create Edge Function.
 */
export function AnnouncementForm({ ownerScopes, audienceOptions }: AnnouncementFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(createAnnouncement, initialState);
  const [, startTransition] = useTransition();

  const [ownerScopeId, setOwnerScopeId] = useState<string>(
    (!state.ok && state.values?.ownerScopeId) || ownerScopes[0]?.id || '',
  );

  // Scheduling state — a Checkbox toggles between "publish now" and
  // "schedule for later" without shifting the layout too much.
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>(''); // YYYY-MM-DD
  const [scheduleTime, setScheduleTime] = useState<string>(''); // HH:mm
  const [recurrenceMode, setRecurrenceMode] = useState<'none' | 'weekly' | 'biweekly' | 'monthly'>(
    'none',
  );
  const [recurrenceUntil, setRecurrenceUntil] = useState<string>('');

  // Channel toggles as React state (so we can drive shadcn Checkbox
  // and still submit via hidden inputs — the checkbox component doesn't
  // participate in form submission by default).
  const [emailChannel, setEmailChannel] = useState(false);

  // Combine date + time into an ISO string for the hidden input the
  // Server Action reads. `datetime-local` semantics say the value is in
  // the browser's local timezone; `new Date(...)` interprets it as
  // local and toISOString() converts to UTC.
  const scheduledPublishAt = useMemo(() => {
    if (!isScheduling || !scheduleDate || !scheduleTime) return '';
    const dt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString();
  }, [isScheduling, scheduleDate, scheduleTime]);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.published ? 'Announcement published.' : 'Announcement saved as draft.');
      if (state.id) startTransition(() => router.push('/exco/announcements'));
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  const fieldErrors = (!state.ok && state.fieldErrors) || {};
  const values = (!state.ok && state.values) || {};

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
        {/* ── Main content (left) ─────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Label htmlFor="title" className="sr-only">
            Title
          </Label>
          <input
            id="title"
            name="title"
            type="text"
            className="w-full border-0 bg-transparent px-0 py-1 text-3xl font-semibold text-foreground placeholder:text-muted-foreground focus:border-0 focus:shadow-none focus:outline-none focus-visible:outline-none"
            style={{ boxShadow: 'none' }}
            placeholder="Announcement title"
            defaultValue={values.title ?? ''}
            required
            maxLength={200}
          />
          {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}

          <div>
            <Label htmlFor="body" className="sr-only">
              Body
            </Label>
            <QuillEditor
              name="body"
              initialValue={values.body ?? ''}
              placeholder="Write the announcement here."
              minHeight={520}
              className="border border-input bg-card rounded-lg p-2"
            />
          </div>
        </div>

        {/* ── Settings sidebar (right, scrollable, hidden scrollbar) ── */}
        <aside className="no-scrollbar flex w-full flex-col gap-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-95 lg:shrink-0 lg:overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Publication Settings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Owner scope */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ownerScopeId" className="text-sm">
                  Publish under
                </Label>
                <Select value={ownerScopeId} onValueChange={setOwnerScopeId}>
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
                {fieldErrors.ownerScopeId && (
                  <p className="text-xs text-destructive">{fieldErrors.ownerScopeId}</p>
                )}
              </div>

              {/* Channels — shadcn Checkbox */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm">Channels</Label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked disabled />
                  <span className="text-muted-foreground">In-app (always on)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={emailChannel}
                    onCheckedChange={(v) => setEmailChannel(v === true)}
                  />
                  <span>Email</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={false} disabled />
                  <span>Forum (Phase 8)</span>
                </label>
                {emailChannel && <input type="hidden" name="channelEmail" value="on" />}
              </div>

              {/* Scheduling toggle */}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={isScheduling}
                  onCheckedChange={(v) => setIsScheduling(v === true)}
                />
                <span>Schedule this announcement</span>
              </label>

              {/* Smooth reveal of the schedule fields */}
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
                      <Label htmlFor="scheduleTime" className="text-sm">
                        At
                      </Label>
                      <TimePicker
                        id="scheduleTime"
                        value={scheduleTime}
                        onChange={setScheduleTime}
                        placeholder="Pick a time"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm">Recurrence</Label>
                      <Select
                        value={recurrenceMode}
                        onValueChange={(v) =>
                          setRecurrenceMode(v as 'none' | 'weekly' | 'biweekly' | 'monthly')
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Does not repeat</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      {recurrenceMode !== 'none' && (
                        <>
                          <Label className="text-xs text-muted-foreground">Until</Label>
                          <DatePicker
                            value={recurrenceUntil}
                            onChange={setRecurrenceUntil}
                            placeholder="Pick an end date"
                          />
                          <p className="text-xs text-amber-600">
                            Recurrence backend lands with the events reminder engine.
                          </p>
                        </>
                      )}
                    </div>

                    {/* Hidden ISO datetime for the Server Action */}
                    <input type="hidden" name="scheduledPublishAt" value={scheduledPublishAt} />
                    {fieldErrors.scheduledPublishAt && (
                      <p className="text-xs text-destructive">{fieldErrors.scheduledPublishAt}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action row — inside the card */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/exco/announcements')}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="outline" size="sm" name="intent" value="draft">
                  Save as Draft
                </Button>
                {isScheduling ? (
                  <Button
                    type="submit"
                    size="sm"
                    name="intent"
                    value="schedule"
                    disabled={!scheduledPublishAt}
                  >
                    Schedule
                  </Button>
                ) : (
                  <Button type="submit" size="sm" name="intent" value="publish">
                    Publish
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audience</CardTitle>
            </CardHeader>
            <CardContent>
              <AudienceSelector ownerScopeId={ownerScopeId} options={audienceOptions} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}

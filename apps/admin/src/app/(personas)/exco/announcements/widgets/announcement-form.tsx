'use client';

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Label, toast } from '@shesa/ui';

import { type AudienceOptions } from '@/components/audience/audience-selector';
import { QuillEditor } from '@/components/rich-editor/quill-editor';

import { createAnnouncement, type AnnouncementFormState } from '../announcement-actions';
import { AudienceCard } from './audience-card';
import type { OwnerScopeOption } from './owner-scope-select';
import { PublicationSettingsCard } from './publication-settings-card';

export type { OwnerScopeOption } from './owner-scope-select';

interface AnnouncementFormProps {
  readonly ownerScopes: readonly OwnerScopeOption[];
  readonly audienceOptions: AudienceOptions;
}

const initialState: AnnouncementFormState = { ok: false };

type RecurrenceMode = 'none' | 'weekly' | 'biweekly' | 'monthly';

/**
 * Announcement create form.
 *
 * Left column: title + Quill body.
 * Right column (sticky, scrollable within viewport):
 *   - Publication Settings card (scope, channels, schedule, actions)
 *   - Audience card (five-group selector)
 */
export function AnnouncementForm({ ownerScopes, audienceOptions }: AnnouncementFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(createAnnouncement, initialState);
  const [, startTransition] = useTransition();

  const [ownerScopeId, setOwnerScopeId] = useState<string>(
    (!state.ok && state.values?.ownerScopeId) || ownerScopes[0]?.id || '',
  );

  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('none');
  const [recurrenceUntil, setRecurrenceUntil] = useState<string>('');
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
          <PublicationSettingsCard
            ownerScopes={ownerScopes}
            ownerScopeId={ownerScopeId}
            onOwnerScopeChange={setOwnerScopeId}
            ownerScopeError={fieldErrors.ownerScopeId}
            emailChannel={emailChannel}
            onEmailChannelChange={setEmailChannel}
            isScheduling={isScheduling}
            onIsSchedulingChange={setIsScheduling}
            scheduleDate={scheduleDate}
            onScheduleDateChange={setScheduleDate}
            scheduleTime={scheduleTime}
            onScheduleTimeChange={setScheduleTime}
            recurrenceMode={recurrenceMode}
            onRecurrenceModeChange={setRecurrenceMode}
            recurrenceUntil={recurrenceUntil}
            onRecurrenceUntilChange={setRecurrenceUntil}
            scheduledPublishAt={scheduledPublishAt}
            scheduleError={fieldErrors.scheduledPublishAt}
            onCancel={() => router.push('/exco/announcements')}
          />

          <AudienceCard ownerScopeId={ownerScopeId} options={audienceOptions} />
        </aside>
      </div>
    </form>
  );
}

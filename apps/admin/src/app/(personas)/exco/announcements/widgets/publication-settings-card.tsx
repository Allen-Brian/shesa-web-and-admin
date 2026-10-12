'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@shesa/ui';

import { ChannelsChecklist } from './channels-checklist';
import { FormActions } from './form-actions';
import { OwnerScopeSelect, type OwnerScopeOption } from './owner-scope-select';
import { ScheduleFields } from './schedule-fields';

type RecurrenceMode = 'none' | 'weekly' | 'biweekly' | 'monthly';

interface PublicationSettingsCardProps {
  readonly ownerScopes: readonly OwnerScopeOption[];
  readonly ownerScopeId: string;
  readonly onOwnerScopeChange: (id: string) => void;
  readonly ownerScopeError?: string | undefined;

  readonly emailChannel: boolean;
  readonly onEmailChannelChange: (v: boolean) => void;

  readonly isScheduling: boolean;
  readonly onIsSchedulingChange: (v: boolean) => void;
  readonly scheduleDate: string;
  readonly onScheduleDateChange: (d: string) => void;
  readonly scheduleTime: string;
  readonly onScheduleTimeChange: (t: string) => void;
  readonly recurrenceMode: RecurrenceMode;
  readonly onRecurrenceModeChange: (m: RecurrenceMode) => void;
  readonly recurrenceUntil: string;
  readonly onRecurrenceUntilChange: (d: string) => void;
  readonly scheduledPublishAt: string;
  readonly scheduleError?: string | undefined;

  readonly onCancel: () => void;
}

export function PublicationSettingsCard(props: PublicationSettingsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Publication Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <OwnerScopeSelect
          value={props.ownerScopeId}
          onChange={props.onOwnerScopeChange}
          options={props.ownerScopes}
          error={props.ownerScopeError}
        />

        <ChannelsChecklist email={props.emailChannel} onEmailChange={props.onEmailChannelChange} />

        <ScheduleFields
          enabled={props.isScheduling}
          onEnabledChange={props.onIsSchedulingChange}
          date={props.scheduleDate}
          onDateChange={props.onScheduleDateChange}
          time={props.scheduleTime}
          onTimeChange={props.onScheduleTimeChange}
          recurrenceMode={props.recurrenceMode}
          onRecurrenceModeChange={props.onRecurrenceModeChange}
          recurrenceUntil={props.recurrenceUntil}
          onRecurrenceUntilChange={props.onRecurrenceUntilChange}
          scheduledPublishAt={props.scheduledPublishAt}
          error={props.scheduleError}
        />

        <FormActions
          isScheduling={props.isScheduling}
          canSchedule={!!props.scheduledPublishAt}
          onCancel={props.onCancel}
        />
      </CardContent>
    </Card>
  );
}

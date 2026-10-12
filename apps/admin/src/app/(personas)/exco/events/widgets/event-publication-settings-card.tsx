'use client';

import { useRouter } from 'next/navigation';

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
} from '@shesa/ui';

import type { OwnerScopeOption } from './event-form';

interface EventPublicationSettingsCardProps {
  readonly ownerScopes: readonly OwnerScopeOption[];
  readonly ownerScopeId: string;
  readonly onOwnerScopeIdChange: (v: string) => void;
  readonly isEdit: boolean;
  readonly isScheduling: boolean;
  readonly onIsSchedulingChange: (v: boolean) => void;
  readonly scheduleDate: string;
  readonly scheduleTime: string;
  readonly onScheduleDateChange: (v: string) => void;
  readonly onScheduleTimeChange: (v: string) => void;
  readonly scheduledPublishAtIso: string;
  readonly fieldErrors: Readonly<Record<string, string | undefined>>;
}

/**
 * Sidebar Publication Settings card — owner scope picker + Schedule-swap
 * checkbox that reveals date/time when enabled + form-action buttons
 * (Cancel / Save Draft / Schedule|Publish).
 */
export function EventPublicationSettingsCard({
  ownerScopes,
  ownerScopeId,
  onOwnerScopeIdChange,
  isEdit,
  isScheduling,
  onIsSchedulingChange,
  scheduleDate,
  scheduleTime,
  onScheduleDateChange,
  onScheduleTimeChange,
  scheduledPublishAtIso,
  fieldErrors,
}: EventPublicationSettingsCardProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Publication Settings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ownerScopeId" className="text-sm">
            Publish under
          </Label>
          <Select value={ownerScopeId} onValueChange={onOwnerScopeIdChange} disabled={isEdit}>
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
            onCheckedChange={(v) => onIsSchedulingChange(v === true)}
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
                  onChange={onScheduleDateChange}
                  placeholder="Pick a date"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">At</Label>
                <TimePicker
                  value={scheduleTime}
                  onChange={onScheduleTimeChange}
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
  );
}

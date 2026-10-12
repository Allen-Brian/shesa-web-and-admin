'use client';

import {
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

type RecurrenceMode = 'none' | 'weekly' | 'biweekly' | 'monthly';

interface ScheduleFieldsProps {
  readonly enabled: boolean;
  readonly onEnabledChange: (v: boolean) => void;
  readonly date: string;
  readonly onDateChange: (d: string) => void;
  readonly time: string;
  readonly onTimeChange: (t: string) => void;
  readonly recurrenceMode: RecurrenceMode;
  readonly onRecurrenceModeChange: (m: RecurrenceMode) => void;
  readonly recurrenceUntil: string;
  readonly onRecurrenceUntilChange: (d: string) => void;
  readonly scheduledPublishAt: string;
  readonly error?: string | undefined;
}

export function ScheduleFields({
  enabled,
  onEnabledChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  recurrenceMode,
  onRecurrenceModeChange,
  recurrenceUntil,
  onRecurrenceUntilChange,
  scheduledPublishAt,
  error,
}: ScheduleFieldsProps) {
  return (
    <>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={enabled} onCheckedChange={(v) => onEnabledChange(v === true)} />
        <span>Schedule this announcement</span>
      </label>

      {/* Smooth reveal of the schedule fields */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          enabled ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Publish on</Label>
              <DatePicker value={date} onChange={onDateChange} placeholder="Pick a date" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduleTime" className="text-sm">
                At
              </Label>
              <TimePicker
                id="scheduleTime"
                value={time}
                onChange={onTimeChange}
                placeholder="Pick a time"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Recurrence</Label>
              <Select
                value={recurrenceMode}
                onValueChange={(v) => onRecurrenceModeChange(v as RecurrenceMode)}
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
                    onChange={onRecurrenceUntilChange}
                    placeholder="Pick an end date"
                  />
                  <p className="text-xs text-amber-600">
                    Recurrence backend lands with the events reminder engine.
                  </p>
                </>
              )}
            </div>

            <input type="hidden" name="scheduledPublishAt" value={scheduledPublishAt} />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>
      </div>
    </>
  );
}

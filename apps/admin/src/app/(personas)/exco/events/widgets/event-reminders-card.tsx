'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DatePicker,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  TimePicker,
} from '@shesa/ui';

type ReminderCadence = 'none' | 'weekly' | 'biweekly' | 'monthly';

interface EventRemindersCardProps {
  readonly cadence: ReminderCadence;
  readonly onCadenceChange: (c: ReminderCadence) => void;
  readonly startDate: string;
  readonly startTime: string;
  readonly onStartDateChange: (v: string) => void;
  readonly onStartTimeChange: (v: string) => void;
  readonly reminderStartAtIso: string;
  readonly customMessage: string;
  readonly onCustomMessageChange: (v: string) => void;
}

/**
 * Sidebar Reminders card — cadence dropdown, optional start date/time,
 * optional custom message. Hidden inputs mirror state into the form
 * submission when cadence is not 'none'.
 */
export function EventRemindersCard({
  cadence,
  onCadenceChange,
  startDate,
  startTime,
  onStartDateChange,
  onStartTimeChange,
  reminderStartAtIso,
  customMessage,
  onCustomMessageChange,
}: EventRemindersCardProps) {
  return (
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
          <Select value={cadence} onValueChange={(v) => onCadenceChange(v as ReminderCadence)}>
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
          {cadence !== 'none' && <input type="hidden" name="reminderCadence" value={cadence} />}
        </div>

        {cadence !== 'none' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Start date</Label>
                <DatePicker
                  value={startDate}
                  onChange={onStartDateChange}
                  placeholder="Publish Date"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Start time</Label>
                <TimePicker
                  value={startTime}
                  onChange={onStartTimeChange}
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
                value={customMessage}
                onChange={(e) => onCustomMessageChange(e.target.value)}
                rows={2}
                placeholder="Uses the event's own name/details by default."
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DatePicker,
  Input,
  Label,
  Separator,
  TimePicker,
} from '@shesa/ui';

import { EventTypeMultiSelect } from './event-type-multi-select';
import type { EventTypeValue } from './event-types-catalog';

interface EventScheduleVenueCardProps {
  readonly startDate: string;
  readonly startTime: string;
  readonly endDate: string;
  readonly endTime: string;
  readonly startAtIso: string;
  readonly endAtIso: string;
  readonly timezone: string;
  readonly venueName: string;
  readonly venueAddress: string;
  readonly venueMapUrl: string;
  readonly onlineUrl: string;
  readonly derivedMode: 'physical' | 'online' | 'hybrid' | 'unset';
  readonly selectedTypes: readonly EventTypeValue[];
  readonly rsvpEnabled: boolean;
  readonly fieldErrors: Readonly<Record<string, string | undefined>>;
  readonly onStartDateChange: (v: string) => void;
  readonly onStartTimeChange: (v: string) => void;
  readonly onEndDateChange: (v: string) => void;
  readonly onEndTimeChange: (v: string) => void;
  readonly onTimezoneChange: (v: string) => void;
  readonly onVenueNameChange: (v: string) => void;
  readonly onVenueAddressChange: (v: string) => void;
  readonly onVenueMapUrlChange: (v: string) => void;
  readonly onOnlineUrlChange: (v: string) => void;
  readonly onToggleType: (v: EventTypeValue) => void;
  readonly onRemoveType: (v: EventTypeValue) => void;
  readonly onRsvpEnabledChange: (v: boolean) => void;
}

/**
 * "Schedule & Venue" card in the events form — dates, timezone, event
 * type multi-select, venue block, derived mode badge, RSVP toggle. All
 * state lives in the parent EventForm so cross-card derivations
 * (`derivedMode` comes from venueName + onlineUrl) stay coherent.
 */
export function EventScheduleVenueCard({
  startDate,
  startTime,
  endDate,
  endTime,
  startAtIso,
  endAtIso,
  timezone,
  venueName,
  venueAddress,
  venueMapUrl,
  onlineUrl,
  derivedMode,
  selectedTypes,
  rsvpEnabled,
  fieldErrors,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
  onTimezoneChange,
  onVenueNameChange,
  onVenueAddressChange,
  onVenueMapUrlChange,
  onOnlineUrlChange,
  onToggleType,
  onRemoveType,
  onRsvpEnabledChange,
}: EventScheduleVenueCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Schedule &amp; Venue</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Start date</Label>
            <DatePicker value={startDate} onChange={onStartDateChange} placeholder="Pick a date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Start time</Label>
            <TimePicker value={startTime} onChange={onStartTimeChange} placeholder="Pick a time" />
          </div>
        </div>
        <input type="hidden" name="startAt" value={startAtIso} />
        {fieldErrors.startAt && <p className="text-xs text-destructive">{fieldErrors.startAt}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">End date</Label>
            <DatePicker value={endDate} onChange={onEndDateChange} placeholder="Pick a date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">End time</Label>
            <TimePicker value={endTime} onChange={onEndTimeChange} placeholder="Pick a time" />
          </div>
        </div>
        <input type="hidden" name="endAt" value={endAtIso} />
        {fieldErrors.endAt && <p className="text-xs text-destructive">{fieldErrors.endAt}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timezone" className="text-sm">
              Timezone (IANA)
            </Label>
            <Input
              id="timezone"
              name="timezone"
              value={timezone}
              onChange={(e) => onTimezoneChange(e.target.value)}
              placeholder="e.g. Africa/Douala"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Event type</Label>
            <EventTypeMultiSelect
              selected={selectedTypes}
              onToggle={onToggleType}
              onRemove={onRemoveType}
            />
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="venueName" className="text-sm">
            Venue name
          </Label>
          <Input
            id="venueName"
            name="venueName"
            value={venueName}
            onChange={(e) => onVenueNameChange(e.target.value)}
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
              onChange={(e) => onVenueAddressChange(e.target.value)}
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
              onChange={(e) => onVenueMapUrlChange(e.target.value)}
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
            onChange={(e) => onOnlineUrlChange(e.target.value)}
            placeholder="https://…"
          />
        </div>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
          Mode:{' '}
          <span className="font-medium text-foreground">
            {derivedMode === 'unset' ? 'Not set' : derivedMode}
          </span>
          {derivedMode === 'unset' && (
            <span className="ml-1 text-muted-foreground">(fill a venue OR an online URL)</span>
          )}
        </div>
        {fieldErrors.venue && <p className="text-xs text-destructive">{fieldErrors.venue}</p>}

        <Separator />

        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={rsvpEnabled}
              onCheckedChange={(v) => onRsvpEnabledChange(v === true)}
            />
            <span>Enable RSVP (Interested / Going)</span>
          </label>
          {rsvpEnabled && <input type="hidden" name="rsvpEnabled" value="on" />}
        </div>
      </CardContent>
    </Card>
  );
}

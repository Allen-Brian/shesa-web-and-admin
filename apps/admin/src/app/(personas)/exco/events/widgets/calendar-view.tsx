'use client';

/**
 * CalendarView — month grid with per-day event instances.
 *
 * A multi-day event contributes one pill to each day it covers, so a
 * three-day event shows up as three pills in three consecutive cells,
 * not one spanning bar. Day numbers stay put and lane-assignment work
 * disappears.
 *
 * Pill colour is driven by the event's first type. A small legend
 * next to the month heading shows only the types that appear in the
 * currently visible grid — the legend reflects what's on screen.
 *
 * Clicking a pill opens a preview Dialog with the event's headline
 * details plus an "Edit Event" button that jumps to the detail /
 * edit page.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Layers,
  MapPin,
  Pencil,
  Users,
} from 'lucide-react';

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@shesa/ui';

import type { EventRow } from './list-view';

const VISIBLE_PILLS_PER_DAY = 3;
const WEEK_STARTS_ON = 1; // Monday

// ─── Event-type styling ─────────────────────────────────────────────
//
// One row per type. `pill` and `dot` are explicit class strings so
// Tailwind's JIT compiler picks them up — dynamic template classes
// (`bg-${color}-500/20`) would silently drop out of the CSS build.
//
// Multi-type events use the first type's colour; missing/unknown
// types fall through to `other`.

interface TypeStyle {
  readonly pill: string;
  readonly dot: string;
  readonly label: string;
}

const TYPE_STYLES: Record<string, TypeStyle> = {
  sports: {
    pill: 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Sports',
  },
  entertainment: {
    pill: 'bg-pink-500/20 text-pink-900 dark:text-pink-200 hover:bg-pink-500/30',
    dot: 'bg-pink-500',
    label: 'Entertainment',
  },
  meeting: {
    pill: 'bg-slate-500/20 text-slate-900 dark:text-slate-200 hover:bg-slate-500/30',
    dot: 'bg-slate-500',
    label: 'Meeting',
  },
  mentorship: {
    pill: 'bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-500/30',
    dot: 'bg-indigo-500',
    label: 'Mentorship',
  },
  assembly: {
    pill: 'bg-violet-500/20 text-violet-900 dark:text-violet-200 hover:bg-violet-500/30',
    dot: 'bg-violet-500',
    label: 'Assembly',
  },
  networking: {
    pill: 'bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 hover:bg-cyan-500/30',
    dot: 'bg-cyan-500',
    label: 'Networking',
  },
  fundraiser: {
    pill: 'bg-amber-500/20 text-amber-900 dark:text-amber-200 hover:bg-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Fundraiser',
  },
  community_service: {
    pill: 'bg-teal-500/20 text-teal-900 dark:text-teal-200 hover:bg-teal-500/30',
    dot: 'bg-teal-500',
    label: 'Community Service',
  },
  cultural: {
    pill: 'bg-rose-500/20 text-rose-900 dark:text-rose-200 hover:bg-rose-500/30',
    dot: 'bg-rose-500',
    label: 'Cultural',
  },
  training: {
    pill: 'bg-blue-500/20 text-blue-900 dark:text-blue-200 hover:bg-blue-500/30',
    dot: 'bg-blue-500',
    label: 'Training',
  },
  ceremony: {
    pill: 'bg-fuchsia-500/20 text-fuchsia-900 dark:text-fuchsia-200 hover:bg-fuchsia-500/30',
    dot: 'bg-fuchsia-500',
    label: 'Ceremony',
  },
  celebration: {
    pill: 'bg-orange-500/20 text-orange-900 dark:text-orange-200 hover:bg-orange-500/30',
    dot: 'bg-orange-500',
    label: 'Celebration',
  },
  conference: {
    pill: 'bg-sky-500/20 text-sky-900 dark:text-sky-200 hover:bg-sky-500/30',
    dot: 'bg-sky-500',
    label: 'Conference',
  },
  other: {
    pill: 'bg-gray-500/20 text-gray-900 dark:text-gray-200 hover:bg-gray-500/30',
    dot: 'bg-gray-500',
    label: 'Other',
  },
};

const OTHER_STYLE = TYPE_STYLES.other!;

function styleForEvent(event: EventRow): TypeStyle {
  const first = event.types[0];
  if (!first) return OTHER_STYLE;
  return TYPE_STYLES[first] ?? OTHER_STYLE;
}

interface CalendarViewProps {
  readonly data: readonly EventRow[];
}

interface DayCellData {
  readonly date: Date;
  readonly events: readonly EventRow[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function humanizeType(t: string): string {
  return t
    .split('_')
    .map((p) => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
}

function formatRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
  const sameDay = format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd');
  if (sameDay) {
    return `${format(s, 'EEE, MMM d, yyyy')} · ${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
  }
  return `${format(s, 'EEE, MMM d, h:mm a')} → ${format(e, 'EEE, MMM d, h:mm a')}`;
}

// ─── Main view ──────────────────────────────────────────────────────

export function CalendarView({ data }: CalendarViewProps) {
  const router = useRouter();
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [preview, setPreview] = useState<EventRow | null>(null);

  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON }),
    [cursor],
  );
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON }),
    [cursor],
  );

  // Every day the event covers gets its own reference to the row.
  // Multi-day events end up in several buckets — one per day they span.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of data) {
      const s = startOfDay(new Date(e.startAt));
      const en = startOfDay(new Date(e.endAt));
      if (Number.isNaN(s.getTime()) || Number.isNaN(en.getTime())) continue;
      // Clip to the visible grid so a January event doesn't drag us
      // through 3000 iterations when the user is on December's page.
      const from = s < gridStart ? gridStart : s;
      const to = en > gridEnd ? gridEnd : en;
      if (from > to) continue;
      const days = differenceInCalendarDays(to, from);
      for (let i = 0; i <= days; i++) {
        const d = addDays(from, i);
        const key = dayKey(d);
        const bucket = map.get(key) ?? [];
        bucket.push(e);
        map.set(key, bucket);
      }
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [data, gridStart, gridEnd]);

  // Types actually present on this month's grid — legend reflects what's
  // on screen rather than listing every type in the catalog.
  const activeTypes = useMemo(() => {
    const set = new Set<string>();
    for (const bucket of eventsByDay.values()) {
      for (const e of bucket) {
        set.add(e.types[0] ?? 'other');
      }
    }
    // Stable order — walk the catalog once so the legend doesn't
    // reshuffle every time an event is added.
    return Object.keys(TYPE_STYLES).filter((t) => set.has(t));
  }, [eventsByDay]);

  const weeks = useMemo<DayCellData[][]>(() => {
    const out: DayCellData[][] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      const row: DayCellData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(d, i);
        row.push({ date, events: eventsByDay.get(dayKey(date)) ?? [] });
      }
      out.push(row);
      d = addDays(d, 7);
    }
    return out;
  }, [eventsByDay, gridStart, gridEnd]);

  const dayLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'EEE'));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Month nav + heading + inline legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-medium">{format(cursor, 'MMMM yyyy')}</h2>
        <TypeLegend activeTypes={activeTypes} />
      </div>

      {/* Header row */}
      <div className="grid grid-cols-7 gap-px rounded-t-md border border-b-0 border-border bg-border">
        {dayLabels.map((label) => (
          <div
            key={label}
            className="bg-muted/40 rounded-t-sm py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex flex-col gap-px overflow-hidden rounded-b-md border border-t-0 border-border bg-border">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px bg-border">
            {week.map((day) => (
              <DayCell
                key={day.date.toISOString()}
                day={day}
                cursor={cursor}
                onEventClick={setPreview}
              />
            ))}
          </div>
        ))}
      </div>

      <EventPreviewDialog
        event={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        onEdit={(id) => {
          setPreview(null);
          router.push(`/exco/events/${id}`);
        }}
      />
    </div>
  );
}

// ─── Type legend ────────────────────────────────────────────────────

function TypeLegend({ activeTypes }: { readonly activeTypes: readonly string[] }) {
  if (activeTypes.length === 0) return null;
  return (
    <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {activeTypes.map((t) => {
        const style = TYPE_STYLES[t] ?? OTHER_STYLE;
        return (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
            <span>{style.label}</span>
          </span>
        );
      })}
    </div>
  );
}

// ─── Day cell ────────────────────────────────────────────────────────

interface DayCellProps {
  readonly day: DayCellData;
  readonly cursor: Date;
  readonly onEventClick: (event: EventRow) => void;
}

function DayCell({ day, cursor, onEventClick }: DayCellProps) {
  const outsideMonth = !isSameMonth(day.date, cursor);
  const todayFlag = isToday(day.date);
  const visible = day.events.slice(0, VISIBLE_PILLS_PER_DAY);
  const overflow = day.events.length - visible.length;

  return (
    <div
      className={`flex min-h-28 flex-col gap-1 bg-card p-1.5 ${
        outsideMonth ? 'bg-muted/95 text-muted-foreground' : ''
      }`}
    >
      <div className="flex justify-end">
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${
            todayFlag ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground'
          }`}
        >
          {day.date.getDate()}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {visible.map((e) => {
          const style = styleForEvent(e);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onEventClick(e)}
              className={`truncate rounded-lg px-3 py-1 text-left text-xs transition-colors ${style.pill}`}
              title={e.name}
            >
              {e.name}
            </button>
          );
        })}
        {overflow > 0 && (
          <button
            type="button"
            onClick={() => {
              const first = day.events[VISIBLE_PILLS_PER_DAY];
              if (first) onEventClick(first);
            }}
            className="px-1 py-0.5 text-left text-[10px] text-muted-foreground hover:text-foreground"
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Event preview dialog ────────────────────────────────────────────

interface EventPreviewDialogProps {
  readonly event: EventRow | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onEdit: (id: string) => void;
}

const MODE_META: Record<'physical' | 'online' | 'hybrid', { icon: typeof MapPin; label: string }> =
  {
    physical: { icon: MapPin, label: 'Physical' },
    online: { icon: Globe, label: 'Online' },
    hybrid: { icon: Layers, label: 'Hybrid' },
  };

function EventPreviewDialog({ event, onOpenChange, onEdit }: EventPreviewDialogProps) {
  const open = event !== null;
  if (!event) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const modeMeta = MODE_META[event.mode];
  const ModeIcon = modeMeta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <DialogTitle className="pr-4 text-lg">{event.name}</DialogTitle>
            <Badge variant="outline" className="capitalize">
              {event.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Owned by <span className="font-medium text-foreground">{event.ownerScopeName}</span>
          </p>
        </DialogHeader>

        {event.types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.types.map((t) => {
              const style = TYPE_STYLES[t] ?? OTHER_STYLE;
              return (
                <span
                  key={t}
                  className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs ${style.pill}`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
                  {humanizeType(t)}
                </span>
              );
            })}
          </div>
        )}

        <Separator />

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-start gap-2">
            <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-col">
              <span>{formatRange(event.startAt, event.endAt)}</span>
              <span className="text-xs text-muted-foreground">Timezone: {event.timezone}</span>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <ModeIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{modeMeta.label}</span>
          </div>

          {event.venueName && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{event.venueName}</span>
            </div>
          )}

          {event.onlineUrl && (
            <div className="flex items-start gap-2">
              <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <a
                href={event.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Join online <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              {event.membersReached === 0 ? 'No reach yet' : `${event.membersReached} reached`}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => onEdit(event.id)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

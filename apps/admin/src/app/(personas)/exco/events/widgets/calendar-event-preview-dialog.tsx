'use client';

import {
  Calendar as CalendarIcon,
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

import { formatEventRange, humanizeType } from './calendar-helpers';
import { OTHER_STYLE, TYPE_STYLES } from './calendar-type-styles';
import type { EventRow } from './list-types';

interface CalendarEventPreviewDialogProps {
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

export function CalendarEventPreviewDialog({
  event,
  onOpenChange,
  onEdit,
}: CalendarEventPreviewDialogProps) {
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
              <span>{formatEventRange(event.startAt, event.endAt)}</span>
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

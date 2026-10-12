import { Archive, Ban, CheckCircle2, Clock, FileText, Globe, Layers, MapPin } from 'lucide-react';

import type { ModeDescriptor, StatusDescriptor } from './list-types';

export const STATUS: Record<string, StatusDescriptor> = {
  draft: { icon: FileText, label: 'Draft', className: 'text-muted-foreground' },
  scheduled: { icon: Clock, label: 'Scheduled', className: 'text-amber-600' },
  published: { icon: CheckCircle2, label: 'Published', className: 'text-emerald-600' },
  unpublished: { icon: Ban, label: 'Unpublished', className: 'text-muted-foreground' },
  archived: { icon: Archive, label: 'Archived', className: 'text-muted-foreground' },
};

export const STATUS_FALLBACK: StatusDescriptor = STATUS.draft as StatusDescriptor;

export const MODE: Record<'physical' | 'online' | 'hybrid', ModeDescriptor> = {
  physical: { icon: MapPin, label: 'Physical' },
  online: { icon: Globe, label: 'Online' },
  hybrid: { icon: Layers, label: 'Hybrid' },
};

export const EVENT_TYPE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'sports', label: 'Sports' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'networking', label: 'Networking' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'community_service', label: 'Community Service' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'training', label: 'Training' },
  { value: 'ceremony', label: 'Ceremony' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' },
];

export const MODE_OPTIONS: readonly { value: 'physical' | 'online' | 'hybrid'; label: string }[] = [
  { value: 'physical', label: 'Physical' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
];

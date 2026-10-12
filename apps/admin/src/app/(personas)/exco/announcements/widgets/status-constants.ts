import { Archive, Ban, CheckCircle2, Clock, FileText } from 'lucide-react';

import type { StatusDescriptor } from './list-types';

export const STATUS: Record<string, StatusDescriptor> = {
  draft: { icon: FileText, label: 'Draft', className: 'text-muted-foreground' },
  scheduled: { icon: Clock, label: 'Scheduled', className: 'text-amber-600' },
  published: { icon: CheckCircle2, label: 'Published', className: 'text-emerald-600' },
  unpublished: { icon: Ban, label: 'Unpublished', className: 'text-muted-foreground' },
  archived: { icon: Archive, label: 'Archived', className: 'text-muted-foreground' },
};

export const STATUS_FALLBACK: StatusDescriptor = STATUS.draft as StatusDescriptor;

export const CHANNEL_LABEL: Record<'in_app' | 'email' | 'forum', string> = {
  in_app: 'In-app',
  email: 'Email',
  forum: 'Forum',
};

export const CHANNEL_TONE: Record<'in_app' | 'email' | 'forum', string> = {
  in_app: 'border-primary/40 bg-primary/10 text-primary',
  email: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  forum: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

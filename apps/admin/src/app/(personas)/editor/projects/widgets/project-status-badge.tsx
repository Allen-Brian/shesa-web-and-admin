'use client';

import { Badge } from '@shesa/ui';

import type { ProjectStatus } from './project-widget-types';

const STYLES: Record<ProjectStatus, string> = {
  Active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  Ongoing: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  Planning: 'border-border bg-muted/40 text-muted-foreground',
  Fundraising: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  Completed: 'border-border bg-muted/40 text-muted-foreground',
};

/** Compact status pill for the projects list table. */
export function ProjectStatusBadge({ status }: { readonly status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={`h-5 ${STYLES[status]}`}>
      {status}
    </Badge>
  );
}

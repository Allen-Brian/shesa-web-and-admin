import type { EventRow } from './list-types';

/**
 * Explicit Tailwind class strings per event type — dynamic template
 * classes (`bg-${color}-500/20`) would silently drop out of the JIT
 * build. One row per type; multi-type events use the first type's
 * colour; missing/unknown falls through to `other`.
 */
export interface TypeStyle {
  readonly pill: string;
  readonly dot: string;
  readonly label: string;
}

export const TYPE_STYLES: Record<string, TypeStyle> = {
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

export const OTHER_STYLE = TYPE_STYLES.other!;

export function styleForEvent(event: EventRow): TypeStyle {
  const first = event.types[0];
  if (!first) return OTHER_STYLE;
  return TYPE_STYLES[first] ?? OTHER_STYLE;
}

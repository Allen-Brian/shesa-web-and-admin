/**
 * Event-type colour palette shared across the dashboard's Upcoming
 * Events list, Calendar tile tint, and inline chip badges. Each type
 * maps to a Tailwind dot class, a badge class combo, and a hex value
 * used by inline styles (calendar cell background tint). Unknown types
 * fall through to `other`.
 */
export interface EventStyle {
  readonly dot: string;
  readonly badge: string;
  readonly hex: string;
}

export const EVENT_TYPE_STYLE: Record<string, EventStyle> = {
  sports: {
    dot: 'bg-emerald-500',
    badge: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    hex: '#10b981',
  },
  entertainment: {
    dot: 'bg-fuchsia-500',
    badge: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400',
    hex: '#d946ef',
  },
  meeting: {
    dot: 'bg-sky-500',
    badge: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    hex: '#0ea5e9',
  },
  mentorship: {
    dot: 'bg-violet-500',
    badge: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-400',
    hex: '#8b5cf6',
  },
  assembly: {
    dot: 'bg-indigo-500',
    badge: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    hex: '#6366f1',
  },
  networking: {
    dot: 'bg-teal-500',
    badge: 'border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-400',
    hex: '#14b8a6',
  },
  fundraiser: {
    dot: 'bg-amber-500',
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    hex: '#f59e0b',
  },
  community_service: {
    dot: 'bg-lime-500',
    badge: 'border-lime-500/40 bg-lime-500/10 text-lime-700 dark:text-lime-500',
    hex: '#84cc16',
  },
  cultural: {
    dot: 'bg-orange-500',
    badge: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400',
    hex: '#f97316',
  },
  training: {
    dot: 'bg-cyan-500',
    badge: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
    hex: '#06b6d4',
  },
  ceremony: {
    dot: 'bg-pink-500',
    badge: 'border-pink-500/40 bg-pink-500/10 text-pink-700 dark:text-pink-400',
    hex: '#ec4899',
  },
  celebration: {
    dot: 'bg-rose-500',
    badge: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400',
    hex: '#f43f5e',
  },
  conference: {
    dot: 'bg-blue-500',
    badge: 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400',
    hex: '#3b82f6',
  },
  other: {
    dot: 'bg-slate-500',
    badge: 'border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300',
    hex: '#64748b',
  },
};

export function eventStyle(types: readonly string[]): EventStyle {
  const primary = types[0] ?? 'other';
  return EVENT_TYPE_STYLE[primary] ?? EVENT_TYPE_STYLE.other!;
}

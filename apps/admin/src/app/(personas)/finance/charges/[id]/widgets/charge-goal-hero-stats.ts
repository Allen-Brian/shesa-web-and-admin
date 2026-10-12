import type { ChargeSummary } from './charge-detail-types';

export interface GoalHeroStats {
  readonly goal: number;
  readonly percent: number;
  readonly remaining: number;
  readonly complete: boolean;
  readonly closed: boolean;
  readonly daysLeft: number | null;
}

/** Windowed numbers for the thermometer: goal/percent/remaining/etc. */
export function buildGoalHeroStats(summary: ChargeSummary, collected: number): GoalHeroStats {
  const goal = summary.goalAmount ?? 0;
  const percent = goal > 0 ? Math.min(100, (collected / goal) * 100) : 0;
  const remaining = Math.max(0, goal - collected);
  const now = Date.now();
  const closeTs = summary.closeDate ? new Date(summary.closeDate).getTime() : null;
  const daysLeft =
    closeTs != null ? Math.max(0, Math.ceil((closeTs - now) / (24 * 60 * 60 * 1000))) : null;
  const closed = closeTs != null && closeTs <= now;
  return { goal, percent, remaining, complete: percent >= 100, closed, daysLeft };
}

/**
 * "Pace hint" — where progress should be if fundraising were linear
 * between open and close dates. Positive `delta` = ahead of schedule,
 * negative = behind. Returns null when there's no schedule to compare
 * against.
 */
export interface GoalPaceHint {
  readonly expectedPercent: number;
  readonly delta: number;
}

export function computeGoalPaceHint(summary: ChargeSummary, percent: number): GoalPaceHint | null {
  const goal = summary.goalAmount ?? 0;
  if (goal === 0) return null;
  const openTs = summary.openDate ? new Date(summary.openDate).getTime() : null;
  const closeTs = summary.closeDate ? new Date(summary.closeDate).getTime() : null;
  if (openTs == null || closeTs == null || closeTs <= openTs) return null;
  const now = Date.now();
  const total = closeTs - openTs;
  const elapsed = Math.min(total, Math.max(0, now - openTs));
  const expectedPercent = (elapsed / total) * 100;
  const delta = percent - expectedPercent;
  return {
    expectedPercent: Math.round(expectedPercent),
    delta: Math.round(delta),
  };
}

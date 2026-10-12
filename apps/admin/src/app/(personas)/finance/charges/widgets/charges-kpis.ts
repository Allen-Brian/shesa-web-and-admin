import type { ChargeRow } from './charges-types';

export interface ChargeKpis {
  readonly total: number;
  readonly active: number;
  readonly draft: number;
  readonly paused: number;
  readonly expected: number;
  readonly collected: number;
  readonly coverage: number | null;
  readonly singleCurrency: string | null;
}

/**
 * Portfolio-level KPIs from the full charges list. Coverage is
 * `collected / expected` clamped to 100; `singleCurrency` is set only
 * when every visible charge shares a currency so the strip doesn't
 * misrepresent multi-currency totals as a single number.
 */
export function buildChargeKpis(charges: readonly ChargeRow[]): ChargeKpis {
  let active = 0;
  let draft = 0;
  let paused = 0;
  let expected = 0;
  let collected = 0;
  for (const c of charges) {
    if (c.status === 'active') active += 1;
    else if (c.status === 'draft') draft += 1;
    else if (c.status === 'paused') paused += 1;
    expected += c.expected;
    collected += c.collected;
  }
  const coverage = expected > 0 ? Math.min(100, Math.round((collected / expected) * 100)) : null;
  const currencyCounts = new Map<string, number>();
  for (const c of charges)
    currencyCounts.set(c.currency, (currencyCounts.get(c.currency) ?? 0) + 1);
  const singleCurrency =
    currencyCounts.size === 1 ? (currencyCounts.keys().next().value ?? null) : null;
  return {
    total: charges.length,
    active,
    draft,
    paused,
    expected,
    collected,
    coverage,
    singleCurrency,
  };
}

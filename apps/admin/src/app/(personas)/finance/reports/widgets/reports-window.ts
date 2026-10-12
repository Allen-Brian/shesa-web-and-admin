import type { Preset } from './reports-types';

/**
 * Resolves a preset key + optional custom dates into the `{from, to}`
 * pair the server action expects. `all` returns an open-lower bound
 * (empty `from`) so the report includes every payment from the
 * charge's history.
 */
export function windowFor(
  preset: Preset,
  customFrom: string,
  customTo: string,
): { from: string; to: string } {
  const to = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case '30d': {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from: iso(from), to: iso(to) };
    }
    case '90d': {
      const from = new Date();
      from.setDate(from.getDate() - 90);
      return { from: iso(from), to: iso(to) };
    }
    case 'mtd': {
      const from = new Date();
      from.setDate(1);
      return { from: iso(from), to: iso(to) };
    }
    case 'ytd': {
      const from = new Date();
      from.setMonth(0, 1);
      return { from: iso(from), to: iso(to) };
    }
    case 'all':
      return { from: '', to: iso(to) };
    case 'custom':
      return { from: customFrom, to: customTo || iso(to) };
  }
}

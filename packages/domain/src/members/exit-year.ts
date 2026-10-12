/**
 * Exit-year default helper.
 *
 * Phase 1 §2.10: `exit_year` defaults to `entry_year + 7`. Members
 * typically complete their intake path in seven years; the default
 * doesn't create a hard boundary (it's just a metadata field on
 * core.members), it seeds a sensible value the operator can override
 * during creation / import / admin correction.
 *
 * Kept pure + separate from the create-member Edge Function so the
 * client-side import review can preview the same value the server
 * will write.
 */

export const DEFAULT_EXIT_YEAR_OFFSET = 7;

export function defaultExitYear(entryYear: number): number {
  return entryYear + DEFAULT_EXIT_YEAR_OFFSET;
}

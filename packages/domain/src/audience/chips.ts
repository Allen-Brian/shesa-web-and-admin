/**
 * Chip-rendering helper for the audience UI.
 *
 * Given an AudienceDefinition and per-scope label maps, produces the
 * human-readable chip labels shown on:
 *   - List rows (truncated: first N chips + `+M more`)
 *   - Detail views (full list)
 *   - The AudienceSelector's live summary
 *
 * Pure function, no React — the caller renders <Chip> from these strings.
 * See docs/product/entities.md#audience-selector for the exact rendering
 * rule ("St Thomas · Legal · Douala", or a single "All members" chip when
 * every group is 'all').
 */

import { AUDIENCE_ALL_LABEL } from './audience-constants';
import { isAudienceAll, type AudienceDefinition } from './schema';

/**
 * Optional label lookups keyed by scope_id or code. Pass whichever you
 * have — missing entries fall back to the raw id. Empty maps are fine.
 */
export interface AudienceLabelMaps {
  /** scope_id → display name (branches, chapters) */
  readonly scopes?: ReadonlyMap<string, string>;
  /** scope_id → display name (houses) */
  readonly houses?: ReadonlyMap<string, string>;
  /** scope_id → display name (networks) — the short_name typically */
  readonly networks?: ReadonlyMap<string, string>;
  /** scope_id → display name (batches) — e.g. "2012 Batch" */
  readonly batches?: ReadonlyMap<string, string>;
  /** ISO-2 country code → display country name */
  readonly countries?: ReadonlyMap<string, string>;
}

/**
 * Chip-list result. When `isAll` is true the caller renders a single
 * "All members" chip; otherwise the ordered `chips` are rendered
 * separated by "·".
 */
export interface AudienceChipList {
  readonly isAll: boolean;
  readonly chips: readonly string[];
}

/**
 * Truncation options for list rows where width is tight.
 */
export interface AudienceChipsOptions {
  /**
   * Maximum chips to keep before collapsing the rest into `+N more`.
   * When undefined, no truncation.
   */
  readonly maxChips?: number;
}

/**
 * Turn an AudienceDefinition into a chip list.
 *
 * Ordering is stable and follows the group order in the spec:
 *   Membership · Location · Houses · Networks · Batches
 *
 * Within a group, values are joined by "+" for compactness (chips are
 * meant to fit a table row). E.g. two selected houses render as
 * "St Thomas + St Peter" (one chip), not two chips.
 */
export function audienceChips(
  def: AudienceDefinition,
  labels: AudienceLabelMaps = {},
  options: AudienceChipsOptions = {},
): AudienceChipList {
  if (isAudienceAll(def)) {
    return { isAll: true, chips: [AUDIENCE_ALL_LABEL] };
  }

  const chips: string[] = [];

  // Membership — branches / autonomous chapters
  if (def.membership.mode === 'specific') {
    const parts = def.membership.scopeIds.map((id) => labels.scopes?.get(id) ?? id);
    chips.push(parts.join(' + '));
  }

  // Location — country / region / city (OR-within)
  if (def.location.mode === 'specific') {
    const parts: string[] = [];
    if (def.location.countries?.length) {
      parts.push(...def.location.countries.map((code) => labels.countries?.get(code) ?? code));
    }
    if (def.location.regions?.length) {
      parts.push(...def.location.regions);
    }
    if (def.location.cities?.length) {
      parts.push(...def.location.cities);
    }
    if (parts.length > 0) chips.push(parts.join(' + '));
  }

  // Houses
  if (def.houses.mode === 'specific') {
    const parts = def.houses.scopeIds.map((id) => labels.houses?.get(id) ?? id);
    chips.push(parts.join(' + '));
  }

  // Networks
  if (def.networks.mode === 'specific') {
    const parts = def.networks.scopeIds.map((id) => labels.networks?.get(id) ?? id);
    chips.push(parts.join(' + '));
  }

  // Batches
  if (def.batches.mode === 'specific') {
    const parts = def.batches.scopeIds.map((id) => labels.batches?.get(id) ?? id);
    chips.push(parts.join(' + '));
  }

  // Truncation
  if (options.maxChips !== undefined && chips.length > options.maxChips) {
    const kept = chips.slice(0, options.maxChips);
    const remaining = chips.length - options.maxChips;
    kept.push(`+${remaining} more`);
    return { isAll: false, chips: kept };
  }

  return { isAll: false, chips };
}

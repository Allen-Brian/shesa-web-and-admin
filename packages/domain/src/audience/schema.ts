/**
 * AudienceDefinition — the Zod schema for the shared Audience/Publishing
 * engine's five-group filter (docs/product/entities.md#audience-selector).
 *
 * The same shape is:
 *   - Validated at the Server Action boundary (announcement create/update).
 *   - Validated again at the Edge Function boundary (defense in depth).
 *   - Stored as JSONB on exco.announcements.audience_definition
 *     (and later exco.events.audience_definition).
 *   - Interpreted by the SQL resolver `exco.resolve_audience(jsonb)`.
 *
 * SEMANTICS — locked in the product spec:
 *   * "All" mode drops the group from the AND (no constraint on that dimension).
 *   * Within a "specific" list: OR (any listed value matches).
 *   * Across groups: AND (every group's predicate must be satisfied).
 *   * For the Location group specifically: countries / regions / cities
 *     are OR'd WITHIN the group.
 *
 * KEEP THIS SHAPE STABLE. The audience_definition JSONB on live rows uses
 * this exact structure; a breaking change requires a schema-version bump
 * plus a data migration.
 */

import { z } from 'zod';

import { uuidSchema } from '../validators';

// -----------------------------------------------------------------------------
// Per-group filter shapes
// -----------------------------------------------------------------------------

/**
 * Scope-id filter — used by Membership / Houses / Networks / Batches. In
 * 'specific' mode the caller supplies a non-empty list of scope UUIDs.
 */
const scopeIdFilter = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('all') }).strict(),
  z
    .object({
      mode: z.literal('specific'),
      scopeIds: z.array(uuidSchema).min(1).max(200),
    })
    .strict(),
]);

/**
 * Location filter — 'specific' mode is OR-within: at least one of
 * countries / regions / cities must be non-empty.
 *
 * Uses z.union (not discriminatedUnion) because the 'specific' variant
 * carries a .refine() enforcing "at least one field populated", and
 * discriminatedUnion requires plain ZodObject variants (no ZodEffects).
 * z.union is a small parse-cost tax we pay to keep the refine local.
 */
const locationFilter = z.union([
  z.object({ mode: z.literal('all') }).strict(),
  z
    .object({
      mode: z.literal('specific'),
      countries: z.array(z.string().trim().min(1).max(3)).max(200).optional(),
      regions: z.array(z.string().trim().min(1).max(120)).max(200).optional(),
      cities: z.array(z.string().trim().min(1).max(120)).max(200).optional(),
    })
    .strict()
    .refine(
      (v) =>
        (v.countries && v.countries.length > 0) ||
        (v.regions && v.regions.length > 0) ||
        (v.cities && v.cities.length > 0),
      {
        message: "location.mode='specific' requires at least one of countries / regions / cities",
      },
    ),
]);

// -----------------------------------------------------------------------------
// AudienceDefinition — the top-level shape
// -----------------------------------------------------------------------------

/**
 * The full audience definition. `version` is `1` for the current shape;
 * a future breaking change bumps it and downstream code branches on the
 * version to interpret older rows.
 */
export const AudienceDefinition = z
  .object({
    version: z.literal(1),
    membership: scopeIdFilter,
    location: locationFilter,
    houses: scopeIdFilter,
    networks: scopeIdFilter,
    batches: scopeIdFilter,
  })
  .strict();

export type AudienceDefinition = z.infer<typeof AudienceDefinition>;

// -----------------------------------------------------------------------------
// Convenience: the "reaches everyone" definition
// -----------------------------------------------------------------------------

/**
 * The audience that matches every active member — every group set to 'all'.
 * Handy default for a new form; UI can start from this and let the admin
 * narrow.
 */
export const AUDIENCE_ALL: AudienceDefinition = {
  version: 1,
  membership: { mode: 'all' },
  location: { mode: 'all' },
  houses: { mode: 'all' },
  networks: { mode: 'all' },
  batches: { mode: 'all' },
};

/**
 * True iff every group is 'all' — i.e. the audience is "everyone with an
 * active membership". Used to render the compact "All members" chip
 * instead of listing every group.
 */
export function isAudienceAll(def: AudienceDefinition): boolean {
  return (
    def.membership.mode === 'all' &&
    def.location.mode === 'all' &&
    def.houses.mode === 'all' &&
    def.networks.mode === 'all' &&
    def.batches.mode === 'all'
  );
}

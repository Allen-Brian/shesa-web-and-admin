/**
 * String constants shared across the audience module. Keeping them in one
 * file avoids drift between the chip label, the resolver docs, and any
 * empty-audience UI copy.
 */

/**
 * The single chip label shown when every group is 'all'. Rendered
 * verbatim in the AudienceSelector summary + list rows.
 */
export const AUDIENCE_ALL_LABEL = 'All members' as const;

/**
 * The current audience-schema version. Bump when the AudienceDefinition
 * shape changes in a breaking way (data migration required).
 */
export const AUDIENCE_VERSION = 1 as const;

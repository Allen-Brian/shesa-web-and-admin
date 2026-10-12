/**
 * @shesa/domain/audience — the shared Audience/Publishing engine's
 * client-side surface.
 *
 * The SQL resolver + count live in the DB (exco.resolve_audience,
 * exco.count_audience). The Edge Function router lives at
 * supabase/functions/audience/. This module is what apps and Server
 * Actions import.
 *
 * Full spec: docs/product/entities.md#shared-audience--publishing-engine
 */

export * from './schema';
export * from './chips';
export * from './audience-constants';

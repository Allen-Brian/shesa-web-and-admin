-- Migration: scopes_created_by_and_slug_unique
--
-- Two small structural changes on `core.scopes`:
--
--   1. Add `created_by uuid` (nullable, FK auth.users, ON DELETE SET NULL).
--      Every future create-scope Edge Function stamps the calling user
--      here so we always know who spun up a branch / chapter / batch /
--      network / house. Nullable so seeded rows (Mainstream root, Shesa
--      Buea, the four houses, "Other" network, batch 1953→) survive the
--      migration without needing a phantom user attribution.
--
--   2. Swap the global slug UNIQUE constraint for per-`scope_type`
--      uniqueness. Rationale: the spec allows same-slug reuse across
--      types — e.g. slug `shesa-buea` as a branch shouldn't block a
--      differently-named branch's autonomous chapter also called
--      `shesa-buea`. Global uniqueness was over-tight; per-type is what
--      the domain actually needs.

-------------------------------------------------------------------------------
-- 1. created_by
-------------------------------------------------------------------------------

ALTER TABLE core.scopes
  ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN core.scopes.created_by IS
  'The auth user who created this scope. NULL for pre-migration rows + seeded fixtures. Populated by every scope-creating Edge Function going forward.';

-------------------------------------------------------------------------------
-- 2. Swap slug uniqueness — global to per-type
-------------------------------------------------------------------------------
-- The original constraint was CREATE TABLE ... slug TEXT NOT NULL UNIQUE,
-- which Postgres names `scopes_slug_key`. Drop it, then add a composite
-- unique on (scope_type, slug).

ALTER TABLE core.scopes DROP CONSTRAINT scopes_slug_key;

ALTER TABLE core.scopes
  ADD CONSTRAINT scopes_slug_type_unique UNIQUE (scope_type, slug);

COMMENT ON CONSTRAINT scopes_slug_type_unique ON core.scopes IS
  'Slug uniqueness is per scope_type. E.g. a branch with slug ''shesa-buea'' and an autonomous chapter with slug ''shesa-buea'' can coexist. Consumers construct URLs as /{scope_type}/{slug} so the pair is what matters.';

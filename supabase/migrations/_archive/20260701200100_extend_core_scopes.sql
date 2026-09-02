-- Migration: extend_core_scopes
--
-- Widens `core.scopes` for Phase 1 §3.1:
--
--   - chapter_kind    enum (autonomous | grouping) — replaces the meaning
--                     previously carried by the `is_autonomous` boolean
--                     for chapter rows. The boolean stays as-is for one
--                     Phase 1 release so the permission-checker recursive
--                     CTE keeps compiling; a follow-up migration drops it
--                     once every caller has been switched to chapter_kind.
--   - entry_year      int — for batch rows (1953 → current), the entry year
--                     that names the batch.
--   - nickname        text — some batches carry an informal nickname
--                     ("The Foundational Class", etc.) surfaced in UI.
--   - country /
--     region_state /
--     city            text — structured geography (§2.6). PostGIS deferred.
--   - metadata        jsonb — free-form scope extensions (e.g. house color).
--
-- Data migration: chapter_kind is populated from the existing is_autonomous
-- flag for every current chapter row. Non-chapter rows keep chapter_kind
-- NULL (a CHECK enforces this so future writers can't drift).
--
-- Backwards compatibility: is_autonomous is left in place and continues to
-- drive the has_permission ancestry-walk. A follow-up migration will:
--   (a) rewrite has_permission's WHERE NOT a.is_autonomous to use
--       chapter_kind directly (scope_type = 'chapter' AND chapter_kind = 'autonomous'),
--   (b) drop the is_autonomous column.
-- Sequencing this way keeps every intermediate state runnable.

-------------------------------------------------------------------------------
-- 1. Enum: chapter_kind
-------------------------------------------------------------------------------

CREATE TYPE core.chapter_kind AS ENUM ('autonomous', 'grouping');

COMMENT ON TYPE core.chapter_kind IS
  'Chapter classification per Phase 1 §2.5: autonomous chapters hold direct memberships and treasury; grouping chapters only tag members whose real membership is at the parent branch.';

-------------------------------------------------------------------------------
-- 2. New columns on core.scopes
-------------------------------------------------------------------------------

ALTER TABLE core.scopes
  ADD COLUMN chapter_kind    core.chapter_kind,
  ADD COLUMN entry_year      INTEGER,
  ADD COLUMN nickname        TEXT,
  ADD COLUMN country         TEXT,
  ADD COLUMN region_state    TEXT,
  ADD COLUMN city            TEXT,
  ADD COLUMN metadata        JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN core.scopes.chapter_kind IS
  'Set only when scope_type = ''chapter''. Backfilled from is_autonomous in this migration.';
COMMENT ON COLUMN core.scopes.entry_year IS
  'Set only when scope_type = ''batch''. The intake year (1953 → current) that names the cohort.';
COMMENT ON COLUMN core.scopes.nickname IS
  'Informal batch name. Optional; NULL for non-batch scopes.';
COMMENT ON COLUMN core.scopes.metadata IS
  'Free-form scope extension bag (e.g. {"color":"blue"} for houses). Prefer typed columns when a value is queried; use metadata only when the field is genuinely opaque to SQL.';

-------------------------------------------------------------------------------
-- 3. Data migration: chapter_kind ← is_autonomous, for chapter rows
-------------------------------------------------------------------------------

UPDATE core.scopes
   SET chapter_kind = CASE WHEN is_autonomous THEN 'autonomous'::core.chapter_kind
                                              ELSE 'grouping'::core.chapter_kind END
 WHERE scope_type = 'chapter';

-------------------------------------------------------------------------------
-- 4. Shape invariants — CHECK constraints
-------------------------------------------------------------------------------

-- chapter_kind is set iff the scope is a chapter. A row like
-- (scope_type='branch', chapter_kind='autonomous') is nonsense and
-- shouldn't be representable.
ALTER TABLE core.scopes
  ADD CONSTRAINT scopes_chapter_kind_only_on_chapters
  CHECK (
    (scope_type =  'chapter' AND chapter_kind IS NOT NULL)
    OR
    (scope_type <> 'chapter' AND chapter_kind IS NULL)
  );

-- entry_year is set iff the scope is a batch. Same rationale.
ALTER TABLE core.scopes
  ADD CONSTRAINT scopes_entry_year_only_on_batches
  CHECK (
    (scope_type =  'batch' AND entry_year IS NOT NULL)
    OR
    (scope_type <> 'batch' AND entry_year IS NULL)
  );

-- Batch entry years land within a plausible window. 1953 is the founding
-- reference (Phase 1 §2.2). Upper bound is generous — the batch generator
-- picks up next year's row before Jan 1 so a few years of headroom is fine.
ALTER TABLE core.scopes
  ADD CONSTRAINT scopes_entry_year_plausible
  CHECK (entry_year IS NULL OR (entry_year BETWEEN 1953 AND 2100));

-------------------------------------------------------------------------------
-- 5. Unique batch-year (partial)
-------------------------------------------------------------------------------
-- Two batch rows sharing entry_year is a data-model error; enforce it.
-- The partial predicate lets non-batch rows have NULL entry_year without
-- colliding on the "one NULL only" rule that non-partial unique indexes
-- would impose.

CREATE UNIQUE INDEX scopes_batch_entry_year_unique
  ON core.scopes (entry_year)
  WHERE scope_type = 'batch';

-------------------------------------------------------------------------------
-- 6. Geography index (deferred)
-------------------------------------------------------------------------------
-- No index on country/region_state/city yet — Phase 1 doesn't have a query
-- shape that would benefit. Members will filter by these via
-- `core.members.current_country` etc. in E1.2. Add here if a scope-lookup
-- pattern surfaces.

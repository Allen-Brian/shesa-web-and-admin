-- Migration: create_exco_announcements
--
-- Phase 2 governance flow — Announcements. Standalone rich-text
-- messages published to a resolved audience via the shared
-- Audience/Publishing engine. Delivery is per-recipient (rows in
-- notifications.notification_deliveries created at publish
-- fanout); read state lives on those delivery rows, not on the
-- announcement itself.
--
-- Full product spec: docs/product/entities.md#announcements
--
-------------------------------------------------------------------------------
-- KEY DECISIONS applied here
-------------------------------------------------------------------------------
--
--   1. Admin visibility is SILOED on owner_scope_id, NOT
--      scope-tree-cascaded — per ADR-0041. A Buea admin sees only
--      Buea's announcements, not Douala's, not their Chapters',
--      not Mainstream-global. Do NOT introduce core.has_permission()
--      into these RLS policies; its recursive scope-tree CTE
--      activates the cascade this decision blocks. See
--      docs/adr/0041-siloed-admin-visibility-for-audience-published-entities.md.
--
--   2. Write authority is EDGE FUNCTION only — per ADR-0033's
--      Phase 2 refinement, exco.announcements is on the "always
--      through an Edge Function" list. Server Actions may NOT
--      write directly. RLS below denies INSERT/UPDATE/DELETE for
--      anon + authenticated; the Edge Function uses the
--      service-role client with in-function policy checks as the
--      authoritative gate.
--
--   3. Members do NOT read from exco.announcements. They read
--      their inbox via notifications.notification_deliveries
--      (RLS on that table already scopes to
--      recipient_user_id = auth.uid()). The delivery row's
--      payload carries the render data (title + body denormalized
--      at publish fanout). Consequence: exco.announcements has one
--      RLS lens only — the siloed admin lens. There is no
--      member-view SELECT policy.
--
--   4. audience_definition is a JSONB blob. The shared audience
--      engine (packages/domain/audience/) defines the Zod schema
--      + resolver; the Edge Function validates the JSONB shape at
--      write time. The DB stays migration-neutral to future
--      audience-schema evolution.
--
--   5. source_event_id (FK to exco.events for reminder
--      announcements per the reminder-engine spec) is DEFERRED
--      to a follow-up migration when the events table lands.
--      Not created here to avoid cross-migration coupling.
--
-------------------------------------------------------------------------------
-- Related decisions
-------------------------------------------------------------------------------
--   RLS silo:        docs/adr/0041-siloed-admin-visibility-for-audience-published-entities.md
--   Edge Function:   docs/adr/0033-server-action-thin-glue-edge-function-authority.md
--   Two-layer auth:  docs/adr/0006-casl-for-authorization.md
--   Schema-per-phase memory rule + Phase 2 owner: exco schema

-------------------------------------------------------------------------------
-- 1. Enums
-------------------------------------------------------------------------------

-- Lifecycle status. Same shape will be reused by exco.events
-- (planned sibling migration).
CREATE TYPE exco.announcement_status AS ENUM (
  'draft',        -- saved, visible only in the admin lens
  'scheduled',    -- publish scheduled for a future time
  'published',    -- audience resolved, delivery rows created
  'unpublished',  -- soft-remove; delivery rows retained for audit
  'archived'      -- long-term archived; also soft-removed
);

COMMENT ON TYPE exco.announcement_status IS
  'Lifecycle: draft → scheduled → published → unpublished/archived. Same shape will be reused by exco.events.';

-- Delivery channels selectable at publish. in_app is always on but
-- stored explicitly so channel-aggregate queries stay a simple
-- ANY / && against the array.
CREATE TYPE exco.announcement_channel AS ENUM (
  'in_app',
  'email',
  'forum'
);

COMMENT ON TYPE exco.announcement_channel IS
  'Delivery channels selectable at publish. in_app is always included (a CHECK constraint enforces its presence). email and forum are toggles.';

-------------------------------------------------------------------------------
-- 2. Table
-------------------------------------------------------------------------------

CREATE TABLE exco.announcements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The scope the admin CREATED this announcement at. Axis of the
  -- RLS silo per ADR-0041. NOT the target audience — that lives
  -- in audience_definition.
  --
  -- ON DELETE RESTRICT is deliberate: archiving a scope should
  -- not silently orphan its announcements. Force an explicit
  -- ownership transfer via the Edge Function.
  owner_scope_id        UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,

  -- Content
  title                 TEXT NOT NULL,
  body                  TEXT NOT NULL DEFAULT '',

  -- Audience definition — validated at write time by the Edge
  -- Function against packages/domain/audience/. Shape:
  --   { membership: {...}, location: {...}, houses: {...},
  --     networks: {...}, batches: {...} }
  -- Five groups, AND-across / OR-within semantics.
  audience_definition   JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Selected delivery channels. in_app is always included; a
  -- CHECK enforces the presence.
  channels              exco.announcement_channel[] NOT NULL
                          DEFAULT ARRAY['in_app']::exco.announcement_channel[],

  -- Optional auto-archive time. NULL = stays until manually
  -- archived. A scheduled sweep (added when the sweep job lands)
  -- flips status to 'archived' after this instant.
  expires_at            TIMESTAMPTZ NULL,

  -- Lifecycle
  status                exco.announcement_status NOT NULL DEFAULT 'draft',
  scheduled_publish_at  TIMESTAMPTZ NULL,   -- REQUIRED when status='scheduled'
  published_at          TIMESTAMPTZ NULL,   -- set at publish transition

  -- Audit columns
  created_by            UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by            UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Title length ceiling — announcements have compact titles;
  -- body carries the detail.
  CONSTRAINT announcements_title_len
    CHECK (char_length(title) BETWEEN 1 AND 200),

  -- expires_at must be strictly future relative to created_at
  -- (or NULL). Prevents accidental past-dated expiries at insert.
  CONSTRAINT announcements_expiry_ordered
    CHECK (expires_at IS NULL OR expires_at > created_at),

  -- Scheduled announcements must carry a scheduled_publish_at.
  -- Other statuses may or may not — once published, the field is
  -- left populated for provenance.
  CONSTRAINT announcements_scheduled_needs_time
    CHECK (
      status <> 'scheduled'
      OR scheduled_publish_at IS NOT NULL
    ),

  -- Published announcements must have published_at.
  CONSTRAINT announcements_published_needs_time
    CHECK (
      status <> 'published'
      OR published_at IS NOT NULL
    ),

  -- Product rule: in_app is always on. Enforced at the array level.
  CONSTRAINT announcements_channels_in_app_always
    CHECK ('in_app' = ANY (channels))
);

COMMENT ON TABLE exco.announcements IS
  'Phase 2 governance flow. Standalone rich-text messages published to a resolved audience via the shared publishing engine. Admin visibility is siloed on owner_scope_id per ADR-0041. Members do not read this table directly — they read via notifications.notification_deliveries.';
COMMENT ON COLUMN exco.announcements.owner_scope_id IS
  'Scope the announcement was CREATED at (RLS silo axis per ADR-0041). Not the target audience — that lives in audience_definition.';
COMMENT ON COLUMN exco.announcements.audience_definition IS
  'JSONB per packages/domain/audience/ Zod schema. Validated by the Edge Function at write time, NOT by the DB.';
COMMENT ON COLUMN exco.announcements.channels IS
  'Selected delivery channels. in_app is always included (CHECK constraint enforced).';
COMMENT ON COLUMN exco.announcements.expires_at IS
  'Optional auto-archive instant. NULL = stays until manually archived.';
COMMENT ON COLUMN exco.announcements.scheduled_publish_at IS
  'When status = scheduled, this is when publish fires. Required by CHECK for scheduled rows; retained after publish for provenance.';

-------------------------------------------------------------------------------
-- 3. Trigger — updated_at maintenance
-------------------------------------------------------------------------------

-- Reuses the shared core.set_updated_at() function defined in
-- 20260629144241_init_core_schema.sql.
CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON exco.announcements
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-------------------------------------------------------------------------------
-- 4. Indexes
-------------------------------------------------------------------------------

-- Admin-lens SELECT is (auth.uid()) → (admin scopes) → owner_scope_id.
-- Backing owner_scope_id lookups is essential to the RLS predicate.
CREATE INDEX announcements_owner_scope_idx
  ON exco.announcements (owner_scope_id);

-- List page filters + stat card counts ("Drafts", "Scheduled", ...).
CREATE INDEX announcements_status_idx
  ON exco.announcements (status);

-- Chronological ordering + "created after" / "published after".
CREATE INDEX announcements_created_at_idx
  ON exco.announcements (created_at DESC);

CREATE INDEX announcements_published_at_idx
  ON exco.announcements (published_at DESC)
  WHERE published_at IS NOT NULL;

-- Scheduled publish sweeps: pg_cron will scan for
-- (status = 'scheduled' AND scheduled_publish_at <= now()).
-- Partial index on the tight sub-set.
CREATE INDEX announcements_scheduled_ready_idx
  ON exco.announcements (scheduled_publish_at)
  WHERE status = 'scheduled';

-- Auto-archive sweep on expires_at.
CREATE INDEX announcements_expiry_sweep_idx
  ON exco.announcements (expires_at)
  WHERE expires_at IS NOT NULL AND status IN ('published', 'unpublished');

-------------------------------------------------------------------------------
-- 5. Grants
-------------------------------------------------------------------------------

-- Authenticated needs SELECT to read via the admin-lens RLS.
-- NO INSERT / UPDATE / DELETE — mutations flow through the
-- announcements Edge Functions using the service_role client per
-- ADR-0033 Phase 2 refinement.
GRANT SELECT ON exco.announcements TO authenticated;

-------------------------------------------------------------------------------
-- 6. RLS
-------------------------------------------------------------------------------

ALTER TABLE exco.announcements ENABLE ROW LEVEL SECURITY;

-- Admin lens — SILOED per ADR-0041.
--
-- An admin sees announcements whose owner_scope_id EXACTLY MATCHES
-- a scope they hold an active admin role at. Descendants are NOT
-- included. Do not add scope-tree traversal to this policy.
--
-- "Admin" per core.is_admin_role_key(): mainstream_admin,
-- branch_admin, batch_admin. Finance / Editor / Recruiter /
-- Announcer are NOT included — they don't get the management lens.
--
-- "Active" means the role assignment is currently in window:
--   starts_at <= NOW()
--   AND revoked_at IS NULL
--   AND (ends_at IS NULL OR ends_at > NOW())
--
-- Global grants (scope_id IS NULL) are excluded because a global
-- grant isn't a scope-owned admin role for this purpose.
CREATE POLICY announcements_admin_can_select
  ON exco.announcements FOR SELECT
  TO authenticated
  USING (
    owner_scope_id IN (
      SELECT ra.scope_id
      FROM core.role_assignments ra
      JOIN core.roles r ON r.id = ra.role_id
      WHERE ra.user_id = auth.uid()
        AND ra.scope_id IS NOT NULL
        AND core.is_admin_role_key(r.key)
        AND ra.starts_at <= NOW()
        AND ra.revoked_at IS NULL
        AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
    )
  );

-- No INSERT / UPDATE / DELETE policy for anon or authenticated.
-- Mutations go through the announcements Edge Functions using the
-- service-role client (which bypasses RLS). Per ADR-0033 Phase 2:
-- exco.announcements is on the "always through Edge Function" list.

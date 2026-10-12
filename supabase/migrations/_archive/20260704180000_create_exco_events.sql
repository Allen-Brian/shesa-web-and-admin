-- Migration: create_exco_events
--
-- Phase 2 governance flow — Events. Structured governance
-- calendar entries (meetings, AGMs, sports days, fundraisers…) with
-- a shared audience, optional RSVPs, optional linked contributions
-- (Phase 3 finance), and reminder announcements.
--
-- Full product spec: docs/product/entities.md#events
--
-------------------------------------------------------------------------------
-- KEY DECISIONS applied here (mirror announcements — ADR-0041 + ADR-0033):
-------------------------------------------------------------------------------
--
--   1. Admin visibility is SILOED on owner_scope_id per ADR-0041.
--      Global mainstream_admin grants map to Mainstream (same
--      pattern as announcements — see migration 20260704160000).
--
--   2. Write authority is EDGE FUNCTION only (ADR-0033 Phase 2). RLS
--      denies INSERT/UPDATE/DELETE for authenticated; the events/*
--      Edge Functions use service-role.
--
--   3. Members do NOT read exco.events directly — their view goes
--      through notifications.notification_deliveries at publish
--      fan-out, same primitive as announcements. (RSVP is the
--      exception; a member reads/writes their own rsvps row via a
--      later member-facing lens.)
--
--   4. audience_definition is a JSONB blob validated at the Edge
--      Function layer by packages/domain/audience/. The SQL
--      resolver exco.resolve_audience(jsonb) walks it.
--
--   5. Multi-tag types via `exco.event_type[]`. Filter chip UI uses
--      the `&&` array-overlaps operator.
--
--   6. `contribution_charge_id` FK to finance.charges is DEFERRED —
--      the finance schema doesn't exist until Phase 3. Added as a
--      plain nullable UUID column now (no FK); a follow-up migration
--      adds the constraint when finance.charges lands.
--
--   7. Reminder cadence + start are stored on the event; the actual
--      cadence generator (pg_cron sweeping active published events
--      and emitting reminder-announcements) lands with the reminder
--      engine — this migration only creates the fields.
--
-------------------------------------------------------------------------------
-- Related decisions
-------------------------------------------------------------------------------
--   RLS silo:        docs/adr/0041-siloed-admin-visibility-for-audience-published-entities.md
--   Edge Function:   docs/adr/0033-server-action-thin-glue-edge-function-authority.md
--   Two-layer auth:  docs/adr/0006-casl-for-authorization.md

-------------------------------------------------------------------------------
-- 1. Enums
-------------------------------------------------------------------------------

-- Lifecycle status — same shape as exco.announcement_status. Kept as
-- a separate type so events and announcements can diverge later
-- without coupling.
CREATE TYPE exco.event_status AS ENUM (
  'draft',
  'scheduled',
  'published',
  'unpublished',
  'archived'
);

COMMENT ON TYPE exco.event_status IS
  'Event lifecycle. Draft → Scheduled → Published → Unpublished / Archived.';

-- Multi-tag event types. Locked spec — extend by follow-up migration.
CREATE TYPE exco.event_type AS ENUM (
  'sports',
  'entertainment',
  'meeting',
  'mentorship',
  'assembly',
  'networking',
  'fundraiser',
  'community_service',
  'cultural',
  'training',
  'ceremony',
  'celebration',
  'conference',
  'other'
);

COMMENT ON TYPE exco.event_type IS
  'Event tags. Multi-tag: an event carries exco.event_type[]. Filters use ANY / && overlap.';

-- Reminder cadence — how often the reminder generator emits a
-- reminder-announcement from an active event.
CREATE TYPE exco.reminder_cadence AS ENUM (
  'weekly',
  'biweekly',
  'monthly'
);

COMMENT ON TYPE exco.reminder_cadence IS
  'Reminder emission cadence for events. Reminders auto-stop at the event start date.';

-------------------------------------------------------------------------------
-- 2. exco.events — the main event row
-------------------------------------------------------------------------------

CREATE TABLE exco.events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Silo axis (ADR-0041). NOT the audience target — audience lives
  -- in audience_definition.
  owner_scope_id            UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,

  -- Content
  name                      TEXT NOT NULL,
  description               TEXT NOT NULL DEFAULT '',
  advert_image_urls         TEXT[] NOT NULL DEFAULT ARRAY[]::text[],

  -- Multi-tag classification.
  types                     exco.event_type[] NOT NULL
                                DEFAULT ARRAY[]::exco.event_type[],

  -- Schedule (UTC + IANA tz string).
  start_at                  TIMESTAMPTZ NOT NULL,
  end_at                    TIMESTAMPTZ NOT NULL,
  timezone                  TEXT NOT NULL DEFAULT 'UTC',

  -- Venue / mode
  venue_name                TEXT,
  venue_address             TEXT,
  venue_map_url             TEXT,
  online_url                TEXT,

  -- Generated mode column — the Edge Function doesn't have to
  -- compute it; STORED so it's indexable. Semantics per the spec.
  mode                      TEXT GENERATED ALWAYS AS (
                              CASE
                                WHEN online_url IS NOT NULL AND venue_name IS NOT NULL
                                  THEN 'hybrid'
                                WHEN online_url IS NOT NULL THEN 'online'
                                ELSE 'physical'
                              END
                            ) STORED,

  -- Audience — same JSONB shape as announcements.
  audience_definition       JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- On-create options — spec locks these at creation time, but the
  -- DB doesn't enforce that (the Edge Function does — it rejects
  -- updates that flip these once the event is anything but draft).
  rsvp_enabled              BOOLEAN NOT NULL DEFAULT false,

  -- Contribution linkage — nullable now; FK constraint to
  -- finance.charges lands with the Phase 3 finance migration.
  contribution_charge_id    UUID NULL,

  -- Reminders — the cadence generator (pg_cron) is separate.
  reminder_cadence          exco.reminder_cadence NULL,
  reminder_start_at         TIMESTAMPTZ NULL,
  reminder_custom_message   TEXT NULL,

  -- Lifecycle
  status                    exco.event_status NOT NULL DEFAULT 'draft',
  scheduled_publish_at      TIMESTAMPTZ NULL,   -- REQUIRED for 'scheduled'
  published_at              TIMESTAMPTZ NULL,   -- set on publish transition

  -- Snapshotted audience size at publish time (Members Reached
  -- column). Same rationale as announcements.resolved_audience_size.
  resolved_audience_size    INTEGER NULL,

  -- Audit
  created_by                UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by                UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Name length ceiling
  CONSTRAINT events_name_len
    CHECK (char_length(name) BETWEEN 1 AND 200),

  -- Schedule ordering
  CONSTRAINT events_schedule_ordered
    CHECK (end_at >= start_at),

  -- Scheduled → must carry a scheduled_publish_at
  CONSTRAINT events_scheduled_needs_time
    CHECK (
      status <> 'scheduled'
      OR scheduled_publish_at IS NOT NULL
    ),

  -- Published → must carry a published_at
  CONSTRAINT events_published_needs_time
    CHECK (
      status <> 'published'
      OR published_at IS NOT NULL
    ),

  -- At least one of venue or online must be set — an event has to
  -- happen somewhere.
  CONSTRAINT events_has_location
    CHECK (venue_name IS NOT NULL OR online_url IS NOT NULL),

  -- Reminder start ≥ now-ish tolerance is left to the Edge Function
  -- so the DB doesn't reject on clock skew, but if a cadence is set
  -- the start must be too.
  CONSTRAINT events_cadence_needs_start
    CHECK (
      reminder_cadence IS NULL
      OR reminder_start_at IS NOT NULL
    )
);

COMMENT ON TABLE exco.events IS
  'Phase 2 governance-flow events. Admin visibility siloed on owner_scope_id per ADR-0041. All writes through supabase/functions/events/* per ADR-0033.';
COMMENT ON COLUMN exco.events.owner_scope_id IS
  'Scope the event was CREATED at (RLS silo axis per ADR-0041). NOT the audience target — that lives in audience_definition.';
COMMENT ON COLUMN exco.events.types IS
  'Multi-tag classification via exco.event_type[]. Filter chips use ANY(x) / && overlap.';
COMMENT ON COLUMN exco.events.mode IS
  'Derived at write time from venue_name / online_url. STORED so it can index.';
COMMENT ON COLUMN exco.events.rsvp_enabled IS
  'Locked at event creation per product spec — Edge Function rejects updates that flip this on a published event.';
COMMENT ON COLUMN exco.events.contribution_charge_id IS
  'Optional link to finance.charges (Phase 3). The FK constraint lands when finance schema ships; kept nullable UUID now.';
COMMENT ON COLUMN exco.events.reminder_cadence IS
  'How often the reminder generator emits a reminder-announcement. NULL = no reminders. Auto-stops at start_at.';
COMMENT ON COLUMN exco.events.resolved_audience_size IS
  'Audience size snapshotted at publish. NULL until published — shown as "Members reached" on the list.';

-------------------------------------------------------------------------------
-- 3. Trigger — updated_at maintenance
-------------------------------------------------------------------------------

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON exco.events
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-------------------------------------------------------------------------------
-- 4. Program items (structured agenda)
-------------------------------------------------------------------------------

CREATE TABLE exco.event_program_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES exco.events(id) ON DELETE CASCADE,
  -- Wall-clock time within the day. TIME (no tz) — the event's own
  -- timezone lives on the parent event row.
  starts_at     TIME NOT NULL,
  title         TEXT NOT NULL,
  detail        TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT event_program_items_title_len
    CHECK (char_length(title) BETWEEN 1 AND 200)
);

COMMENT ON TABLE exco.event_program_items IS
  'Structured agenda for an event — rendered as a timeline on the detail page. Ordered by (sort_order, starts_at).';

CREATE INDEX event_program_items_event_idx
  ON exco.event_program_items (event_id, sort_order, starts_at);

-------------------------------------------------------------------------------
-- 5. RSVPs
-------------------------------------------------------------------------------

CREATE TYPE exco.rsvp_response AS ENUM ('interested', 'going');
COMMENT ON TYPE exco.rsvp_response IS
  'Member RSVP response. Locked pair — new values require an ADR + migration.';

CREATE TABLE exco.event_rsvps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES exco.events(id) ON DELETE CASCADE,
  member_id       UUID NOT NULL REFERENCES core.members(id) ON DELETE CASCADE,
  response        exco.rsvp_response NOT NULL,
  -- Optional pledge amount (for events that carry a contribution).
  -- Denominated in the contribution's currency — resolved at read
  -- time via the linked charge.
  pledge_amount   NUMERIC(12, 2) NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One RSVP per (event, member). Toggling response updates in place.
  CONSTRAINT event_rsvps_unique_per_member
    UNIQUE (event_id, member_id),

  -- Pledge must be non-negative when set.
  CONSTRAINT event_rsvps_pledge_nonneg
    CHECK (pledge_amount IS NULL OR pledge_amount >= 0)
);

COMMENT ON TABLE exco.event_rsvps IS
  'Member RSVP responses. Only relevant when the parent event has rsvp_enabled = true (Edge Function checks; RLS + trigger backstops land with the RSVP endpoints in a follow-up).';

CREATE INDEX event_rsvps_event_idx ON exco.event_rsvps (event_id);
CREATE INDEX event_rsvps_member_idx ON exco.event_rsvps (member_id);

CREATE TRIGGER event_rsvps_set_updated_at
  BEFORE UPDATE ON exco.event_rsvps
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-------------------------------------------------------------------------------
-- 6. Indexes on exco.events
-------------------------------------------------------------------------------

CREATE INDEX events_owner_scope_idx
  ON exco.events (owner_scope_id);

CREATE INDEX events_status_idx
  ON exco.events (status);

CREATE INDEX events_start_at_idx
  ON exco.events (start_at);

CREATE INDEX events_end_at_idx
  ON exco.events (end_at);

CREATE INDEX events_mode_idx
  ON exco.events (mode);

-- Scheduled sweep: pg_cron picks up ready-to-publish rows.
CREATE INDEX events_scheduled_ready_idx
  ON exco.events (scheduled_publish_at)
  WHERE status = 'scheduled';

-- Reminder sweep: pg_cron picks up published events with a cadence
-- whose next-emission window is due.
CREATE INDEX events_reminder_active_idx
  ON exco.events (reminder_start_at)
  WHERE status = 'published' AND reminder_cadence IS NOT NULL;

-- Multi-tag lookups via GIN.
CREATE INDEX events_types_idx
  ON exco.events USING GIN (types);

-------------------------------------------------------------------------------
-- 7. Grants
-------------------------------------------------------------------------------

GRANT SELECT ON exco.events                TO authenticated;
GRANT SELECT ON exco.event_program_items   TO authenticated;
GRANT SELECT ON exco.event_rsvps           TO authenticated;

-- No INSERT/UPDATE/DELETE — all writes go through Edge Functions per
-- ADR-0033 Phase 2 refinement.

-------------------------------------------------------------------------------
-- 8. RLS
-------------------------------------------------------------------------------

ALTER TABLE exco.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exco.event_program_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE exco.event_rsvps         ENABLE ROW LEVEL SECURITY;

-- Admin lens for exco.events — same siloed pattern as announcements
-- (per ADR-0041), including the Mainstream mapping for global
-- mainstream_admin grants.
CREATE POLICY events_admin_can_select
  ON exco.events FOR SELECT
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

      UNION ALL

      SELECT s.id
      FROM core.scopes s
      WHERE s.scope_type = 'mainstream'
        AND EXISTS (
          SELECT 1
          FROM core.role_assignments ra2
          JOIN core.roles r2 ON r2.id = ra2.role_id
          WHERE ra2.user_id = auth.uid()
            AND ra2.scope_id IS NULL
            AND r2.key = 'mainstream_admin'
            AND ra2.starts_at <= NOW()
            AND ra2.revoked_at IS NULL
            AND (ra2.ends_at IS NULL OR ra2.ends_at > NOW())
        )
    )
  );

COMMENT ON POLICY events_admin_can_select ON exco.events IS
  'ADR-0041 admin-lens SELECT — siloed on owner_scope_id. Global mainstream_admin grants map to Mainstream (mirrors announcements policy).';

-- Program items: readable if the parent event is readable. Deny
-- otherwise (Edge Function service-role writes both together).
CREATE POLICY event_program_items_admin_can_select
  ON exco.event_program_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exco.events e
      WHERE e.id = exco.event_program_items.event_id
    )
    -- Note: the EXISTS above relies on exco.events' own RLS to filter
    -- — if the caller can't SELECT the parent event, the EXISTS
    -- returns false, and this row is hidden.
  );

-- RSVPs: an admin sees RSVPs at events they can see (via the same
-- parent-event lens). Member-owned reads/writes come later with the
-- member inbox surface.
CREATE POLICY event_rsvps_admin_can_select
  ON exco.event_rsvps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exco.events e
      WHERE e.id = exco.event_rsvps.event_id
    )
  );

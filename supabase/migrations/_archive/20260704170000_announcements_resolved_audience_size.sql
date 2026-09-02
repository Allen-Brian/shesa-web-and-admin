-- Migration: announcements_resolved_audience_size
--
-- Adds `resolved_audience_size` to exco.announcements — the count of
-- members the audience resolver matched at publish time. Powers the
-- "Members reached" column on the announcements list.
--
-- Why not derive from notification_events at read time:
--   * The publish fan-out only creates events for members with a
--     claimed auth account (core.member_accounts.auth_user_id NOT
--     NULL). Members without claimed accounts are still part of the
--     resolved audience — they just can't get an in-app inbox row.
--     Counting only events understates the true "reach" the admin
--     targeted.
--   * Recomputing from notifications on every list load is O(rows) per
--     announcement and gets progressively slower.
--
-- Snapshotted on publish. NULL for draft/scheduled (nothing resolved
-- yet). Set to 0 explicitly when no members match. Non-null values
-- mean "publish ran and resolved this many members" regardless of
-- how many actually got a delivery row.

ALTER TABLE exco.announcements
  ADD COLUMN IF NOT EXISTS resolved_audience_size INTEGER;

COMMENT ON COLUMN exco.announcements.resolved_audience_size IS
  'Number of members the audience resolver matched at publish time. NULL until the announcement has been published at least once. Used as "Members reached" on the list view — distinct from the delivered-count which is a subset (only members with claimed auth accounts get delivery rows).';

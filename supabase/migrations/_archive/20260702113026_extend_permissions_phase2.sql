-- Migration: extend_permissions_phase2
--
-- Phase 2's new permission keys — one migration for the whole set so
-- staging/prod pick them up on the same deploy. Same catalog pattern
-- as prior `extend_permissions_*` migrations.
--
-- 14 new keys spanning the Phase 2 surfaces:
--   registration.waive             — Epic 2.4
--   event.create / update / publish / cancel / archive
--   event.contribution.review     — Epic 2.7 (Finance role)
--   announcement.create / update / publish / archive
--   member.bulk_action            — Epic 2.3
--   command.search                — Epic 2.11 (permission-filtered palette results)
--   admin_notification.read       — Epic 2.10 (bell + notifications route)

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000029', 'registration.waive',
   'Waive a member''s registration fee. Distinct from mark_paid because the audit action is different.'),
  ('22222222-0000-0000-0000-000000000030', 'event.create',
   'Create a governance event (Meeting, AGM, Convention, etc.) at a scope.'),
  ('22222222-0000-0000-0000-000000000031', 'event.update',
   'Edit a draft or scheduled event.'),
  ('22222222-0000-0000-0000-000000000032', 'event.publish',
   'Transition an event from draft/scheduled to published; makes it visible to the target audience.'),
  ('22222222-0000-0000-0000-000000000033', 'event.cancel',
   'Cancel a published or scheduled event.'),
  ('22222222-0000-0000-0000-000000000034', 'event.archive',
   'Archive a completed or cancelled event.'),
  ('22222222-0000-0000-0000-000000000035', 'event.contribution.review',
   'Review event contribution settings (Finance approval placeholder until Phase 3 finance ships).'),
  ('22222222-0000-0000-0000-000000000036', 'announcement.create',
   'Create an announcement draft.'),
  ('22222222-0000-0000-0000-000000000037', 'announcement.update',
   'Edit a draft or scheduled announcement.'),
  ('22222222-0000-0000-0000-000000000038', 'announcement.publish',
   'Publish an announcement (immediate or scheduled).'),
  ('22222222-0000-0000-0000-000000000039', 'announcement.archive',
   'Archive an announcement (published, expired, or draft).'),
  ('22222222-0000-0000-0000-000000000040', 'member.bulk_action',
   'Run a bulk action (invite, export, assign sector, mark left, etc.) over a selected member list.'),
  ('22222222-0000-0000-0000-000000000041', 'command.search',
   'Consume command-palette search results across members/events/announcements. Permission-filtered per current context.'),
  ('22222222-0000-0000-0000-000000000042', 'admin_notification.read',
   'Read + mark-read the admin notification bell + inbox.')
ON CONFLICT (key) DO NOTHING;

-------------------------------------------------------------------------------
-- Role bundle assignments — reaffirm via key even though seed.sql's
-- CROSS JOIN would cover mainstream_admin on next db:reset. Staging/prod
-- do NOT re-run seed, so grant here for the persistence path.
-------------------------------------------------------------------------------

-- Mainstream Admin: every new key.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'registration.waive',
  'event.create', 'event.update', 'event.publish', 'event.cancel', 'event.archive',
  'event.contribution.review',
  'announcement.create', 'announcement.update', 'announcement.publish', 'announcement.archive',
  'member.bulk_action', 'command.search', 'admin_notification.read'
)
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- Branch Admin: everything except event.contribution.review (that's Finance).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'registration.waive',
  'event.create', 'event.update', 'event.publish', 'event.cancel', 'event.archive',
  'announcement.create', 'announcement.update', 'announcement.publish', 'announcement.archive',
  'member.bulk_action', 'command.search', 'admin_notification.read'
)
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-- Batch Admin: registration + announcements + bulk actions + palette + notifications.
-- No event creation (batches don't own the geographic Exco calendar).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'registration.waive',
  'announcement.create', 'announcement.update', 'announcement.publish', 'announcement.archive',
  'member.bulk_action', 'command.search', 'admin_notification.read'
)
WHERE r.key = 'batch_admin'
ON CONFLICT DO NOTHING;

-- Finance role: the contribution review permission (Phase 2 placeholder
-- until Phase 3 finance module ships). Also gets admin_notification.read
-- so Finance sees contribution-review notifications.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('event.contribution.review', 'admin_notification.read', 'command.search')
WHERE r.key = 'finance'
ON CONFLICT DO NOTHING;

-- Editor role: announcement create/update/publish/archive + palette access.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'announcement.create', 'announcement.update', 'announcement.publish', 'announcement.archive',
  'command.search'
)
WHERE r.key = 'editor'
ON CONFLICT DO NOTHING;

-- Announcer role: publish announcements + palette. Cannot draft or archive.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('announcement.publish', 'command.search')
WHERE r.key = 'announcer'
ON CONFLICT DO NOTHING;

-- Recruiter role: palette access only (they don't consume Exco governance
-- flows; they use it to look up members for job matching).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key = 'command.search'
WHERE r.key = 'recruiter'
ON CONFLICT DO NOTHING;

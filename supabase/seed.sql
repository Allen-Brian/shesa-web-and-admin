-- Seed data — minimal Phase 0 fixtures.
--
-- This file runs after migrations on `supabase db reset` and on `supabase
-- start`'s first boot. Seeds run as the superuser, so RLS doesn't apply.
--
-- Scope (per the "schemas per phase" principle): seed only what E2's
-- tables need to be exercised. Role / member / finance / etc. seeds land
-- in their respective epics. We need:
--
--   - The single Mainstream node (the tree's root).
--   - One sample Branch under it, with its capability profile, so we can
--     verify the hierarchy works end-to-end (insert, recursive query,
--     capability lookup).
--
-- Larger seed fixtures (more branches, chapters, batches, sample users)
-- arrive in E3 (RBAC) and E9 (auth) when there's actually code that
-- consumes them.

-------------------------------------------------------------------------------
-- 1. The single Mainstream node
-------------------------------------------------------------------------------

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Shesa Mainstream',
  'shesa-mainstream',
  'mainstream',
  NULL,
  'XAF'
);

-- Mainstream's capabilities — full feature surface, since admin-of-everything
-- decisions are anchored here.
INSERT INTO core.scope_capabilities (
  scope_id,
  can_manage_members,
  can_have_treasury,
  can_create_binding_dues,
  can_have_website_page,
  can_have_forum,
  can_label_active_passive
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
);

-------------------------------------------------------------------------------
-- 2. One sample Branch (verifies parent FK + autonomy + capability flow)
-------------------------------------------------------------------------------

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, is_autonomous, currency_code)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Shesa Buea',
  'shesa-buea',
  'branch',
  '00000000-0000-0000-0000-000000000001',  -- parent: mainstream
  FALSE,
  'XAF'
);

INSERT INTO core.scope_capabilities (
  scope_id,
  can_manage_members,
  can_have_treasury,
  can_create_binding_dues,
  can_have_website_page,
  can_have_forum,
  can_label_active_passive
)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
);

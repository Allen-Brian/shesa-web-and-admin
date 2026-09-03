-- Phase 5 — SEC-10 and SEC-12.
--
-- A) SEC-10: unpublished articles were world-readable.
--
--    `cms.articles` is the only CMS table with a real publish state
--    (draft → scheduled → published → archived, plus `publish_at`), and
--    its read policy was `FOR SELECT TO anon, authenticated USING (true)`.
--    The public News page filters `status = 'published'` in its query, so
--    the site looked correct — but the filter lived in the client, and
--    PostgREST will happily answer a request that omits it:
--
--        GET /rest/v1/articles?select=*  (Accept-Profile: cms)
--
--    with the anon key that ships in every browser bundle. That returns
--    every draft and every scheduled-but-embargoed article: unreleased
--    announcements, half-written statements, anything an editor saved and
--    had not chosen to publish.
--
--    The other 23 CMS tables keep `USING (true)` deliberately — categories,
--    sectors, leader rosters, gallery media and songs are all published
--    reference data with no unpublished state to leak.
--
--    Editors keep full visibility: `articles_write_editor` has no FOR
--    clause, so it is FOR ALL and already covers SELECT for holders of
--    `cms.edit`. Permissive policies OR together, so an editor sees drafts
--    through that policy while the public sees only published rows.
--
--    The predicate deliberately matches the app's own filter exactly
--    (`status = 'published'`, no `publish_at` comparison). Adding a time
--    guard here would make RLS stricter than the page and could hide a
--    published article whose `publish_at` an editor set in the future.
--
-- B) SEC-12: new CMS tables were born public.
--
--    `ALTER DEFAULT PRIVILEGES ... IN SCHEMA cms` granted SELECT to anon
--    and full DML to authenticated on *every table created in the schema
--    thereafter*. A new table is therefore readable and writable by anyone
--    holding the anon key from the moment it exists — before anyone has
--    written a policy for it, and entirely if its author forgets
--    `ENABLE ROW LEVEL SECURITY`.
--
--    All 24 existing tables already carry explicit per-table grants, so
--    revoking the defaults changes nothing today. It only means the next
--    table has to be granted deliberately. `security_hardening.test.sql`
--    asserts the defaults stay revoked and that every table in the six
--    app schemas has RLS on.

-- ── A) SEC-10 ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS articles_select_public ON cms.articles;

CREATE POLICY articles_select_public ON cms.articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

COMMENT ON POLICY articles_select_public ON cms.articles IS
  'Public read is limited to published articles. Editors see drafts through articles_write_editor, which is FOR ALL. Before SEC-10 this was USING (true) and any holder of the anon key could read every draft.';

-- ── B) SEC-12 ────────────────────────────────────────────────────────
-- Scoped to the current role, which is the role the dump recorded these
-- under (`FOR ROLE postgres`). Repeat-safe: REVOKE of a privilege that is
-- not there is a no-op.
ALTER DEFAULT PRIVILEGES IN SCHEMA cms REVOKE SELECT ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA cms REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM authenticated;

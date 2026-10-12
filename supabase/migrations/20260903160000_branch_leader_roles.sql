-- A branch has a president and, often, a vice president.
--
-- `cms.branch_leaders` and `cms.diaspora_leaders` could hold only one kind
-- of person. There was no role column at all — the word "president" was
-- hardcoded into the dialog title, the field label and the component
-- names, so a second row for the same branch would render as a second
-- president with nothing to distinguish it.
--
-- Existing rows all become `president`, which is what they are: the
-- surface that created them could not have produced anything else.
--
-- A text column with a CHECK rather than an enum, deliberately. The public
-- leadership page is display, not governance — the real position catalogue
-- is `core.position_catalog`, which already carries Secretary, Treasurer,
-- PRO and the rest for actual role assignments. Coupling the CMS to it
-- would mean a change to the org chart silently rewriting the website.
-- Widening this list later is one migration; extending an enum is more.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['branch_leaders', 'diaspora_leaders']
  LOOP
    EXECUTE format(
      'ALTER TABLE cms.%I ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT ''president''', t
    );
    EXECUTE format(
      'ALTER TABLE cms.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_role_check'
    );
    EXECUTE format(
      'ALTER TABLE cms.%I ADD CONSTRAINT %I CHECK (role = ANY (ARRAY[''president''::text, ''vice_president''::text]))',
      t, t || '_role_check'
    );

    -- One president and one vice president per branch. A branch with two
    -- presidents is a data-entry mistake, and the public page has no way
    -- to render it sensibly.
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS %I ON cms.%I (branch_name, role)',
      t || '_branch_role_key', t
    );
  END LOOP;
END $$;

COMMENT ON COLUMN cms.branch_leaders.role IS
  'president or vice_president. Display only — the authoritative role assignments live in core.role_assignments against core.position_catalog. One of each per branch, enforced by branch_leaders_branch_role_key.';

COMMENT ON COLUMN cms.diaspora_leaders.role IS
  'president or vice_president, for a diaspora chapter. Display only; see cms.branch_leaders.role.';

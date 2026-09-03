-- Any project or public event can take contributions.
--
-- `exco.events` has had `contribution_charge_id` since the governance
-- events work. The two public entities did not, and each had grown its own
-- half-answer instead:
--
--   · `cms.projects` carries `funding_raised` / `funding_target` — numbers
--     an editor types in by hand. They display a progress bar and are
--     connected to nothing; money actually collected never moves them.
--   · `cms.site_events` carries `ticket_url`, which sends the visitor to
--     *somebody else's* checkout. Whatever happens there never reaches
--     these books at all.
--
-- Both now point at a `finance.charge`, which is the only thing in this
-- system that represents "money may be paid for this". Turning funding on
-- creates the charge; closing it closes the charge; the public button is
-- derived from whether the charge is open rather than from a separate
-- flag that could disagree with it.
--
-- ON DELETE SET NULL, not CASCADE: deleting a charge must never delete the
-- project that was raising for it.

ALTER TABLE cms.projects
  ADD COLUMN contribution_charge_id uuid REFERENCES finance.charges(id) ON DELETE SET NULL;

ALTER TABLE cms.site_events
  ADD COLUMN contribution_charge_id uuid REFERENCES finance.charges(id) ON DELETE SET NULL;

COMMENT ON COLUMN cms.projects.contribution_charge_id IS
  'The finance charge this project raises into. NULL means it is not accepting contributions. Set it and the Contribute button appears on the public page; close the charge and it disappears — there is no separate on/off flag to fall out of step with the money.';

COMMENT ON COLUMN cms.site_events.contribution_charge_id IS
  'The finance charge this event collects into. NULL means it is not accepting contributions. Distinct from `ticket_url`, which points at an external checkout this system never sees.';

CREATE INDEX projects_contribution_charge_idx
  ON cms.projects (contribution_charge_id) WHERE contribution_charge_id IS NOT NULL;
CREATE INDEX site_events_contribution_charge_idx
  ON cms.site_events (contribution_charge_id) WHERE contribution_charge_id IS NOT NULL;

-------------------------------------------------------------------------------
-- What the public page is allowed to know about a charge
-------------------------------------------------------------------------------
-- The button needs a name, a price and whether it is open. `anon` has no
-- read on `finance.charges` and should not get one — that table carries
-- every charge in the organisation, including internal dues.
--
-- So: one SECURITY DEFINER function returning a deliberately small
-- projection, and only for a charge some *published* thing actually points
-- at. Guessing a UUID is not the concern; returning internal charges to
-- anyone who guesses one is, and this cannot.

CREATE OR REPLACE FUNCTION finance.public_contribution(p_charge_id uuid)
RETURNS TABLE (
  charge_id   uuid,
  name        text,
  shape       text,
  base_amount numeric,
  currency    text,
  close_date  timestamptz,
  is_open     boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    c.id,
    c.name,
    c.shape::text,
    c.base_amount,
    c.currency,
    c.close_date,
    (
      c.status = 'active'
      AND (c.open_date  IS NULL OR c.open_date  <= now())
      AND (c.close_date IS NULL OR c.close_date >= now())
    ) AS is_open
  FROM finance.charges c
  WHERE c.id = p_charge_id
    -- Reachable only through something already published.
    AND (
      EXISTS (SELECT 1 FROM cms.projects    p WHERE p.contribution_charge_id = c.id)
      OR EXISTS (SELECT 1 FROM cms.site_events e WHERE e.contribution_charge_id = c.id)
      OR EXISTS (SELECT 1 FROM exco.events    x WHERE x.contribution_charge_id = c.id)
      -- The AGM group is a published surface of its own, with no row in
      -- any of the three tables above pointing at its seven charges.
      OR EXISTS (
        SELECT 1 FROM finance.groups g
         WHERE g.id = c.group_id AND g.slug = 'agm-2026'
      )
    );
$$;

COMMENT ON FUNCTION finance.public_contribution(uuid) IS
  'The little a public page may know about a charge: name, price, currency, and whether it is open right now. SECURITY DEFINER because anon has no read on finance.charges and must not — that table holds internal dues alongside public campaigns. Answers only for charges a published project, site event, governance event or the AGM group points at.';

REVOKE ALL ON FUNCTION finance.public_contribution(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.public_contribution(uuid) TO anon, authenticated, service_role;

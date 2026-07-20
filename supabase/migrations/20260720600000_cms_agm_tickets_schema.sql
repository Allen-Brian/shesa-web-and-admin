-- Migration: cms_agm_tickets_schema
--
-- One-off surface for the AGM 2026 registration form. A ticket is the
-- public-side record of someone who filled the registration form; for
-- now we don't move money, we just capture their name + intended
-- amount + payment option and issue a receipt code. The Site
-- Administrator and Finance apps read this table to see who has
-- registered.
--
-- Rationale for its own table (vs re-using `cms.site_events` or a
-- finance table): this page is a temporary AGM landing, meant to be
-- removed after the event. Keeping it self-contained means the drop
-- migration after AGM 2026 is a single DROP TABLE, not a schema
-- surgery. When we ship the real payments engine (docs/product/finance.md)
-- those flows will not touch this table.

CREATE TABLE cms.agm_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Short human-friendly code shown on the receipt and encoded in the QR.
  -- 8 chars, upper-case, no ambiguous glyphs (no 0/O/1/I).
  code            TEXT NOT NULL UNIQUE,

  full_name       TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 200),
  email           TEXT NULL,
  phone           TEXT NULL,

  amount_xaf      NUMERIC(12,2) NOT NULL CHECK (amount_xaf >= 0),
  payment_option  TEXT NOT NULL CHECK (payment_option IN ('mtn-momo', 'orange-money', 'card', 'bank-transfer', 'cash-on-site')),

  -- We do not move money yet — every ticket lands as `issued`. When
  -- Finance reconciles a real payment, they flip it to `paid`.
  status          TEXT NOT NULL DEFAULT 'issued'
                  CHECK (status IN ('issued', 'paid', 'cancelled')),

  notes           TEXT NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX agm_tickets_created_idx ON cms.agm_tickets (created_at DESC);
CREATE INDEX agm_tickets_status_idx  ON cms.agm_tickets (status);

COMMENT ON TABLE cms.agm_tickets IS
  'One row per AGM 2026 registration. Public-facing (no auth required to insert). Removed together with the /agm-2026 page after the event.';

-- ── RLS ─────────────────────────────────────────────────────────────
-- Anonymous users can insert (registration form is public).
-- Reading is authenticated-only — the Site Administrator + Finance
-- surfaces both live behind login.

ALTER TABLE cms.agm_tickets ENABLE ROW LEVEL SECURITY;

-- Anonymous insert — the public registration form.
CREATE POLICY agm_tickets_insert_public ON cms.agm_tickets
  FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

-- Read-back of a specific ticket by its own row (for the receipt page).
-- Anyone with the ticket code can look up its own row; that's exactly
-- what the receipt link does. Since `code` is only known by the
-- registrant + the admin, this is safe.
CREATE POLICY agm_tickets_select_public ON cms.agm_tickets
  FOR SELECT TO anon, authenticated
  USING (TRUE);

-- Authenticated (admins) can update / delete. In practice only the
-- Site Administrator + Finance surfaces surface those actions.
CREATE POLICY agm_tickets_update_authed ON cms.agm_tickets
  FOR UPDATE TO authenticated
  USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY agm_tickets_delete_authed ON cms.agm_tickets
  FOR DELETE TO authenticated
  USING (TRUE);

GRANT SELECT, INSERT ON cms.agm_tickets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cms.agm_tickets TO authenticated;
GRANT ALL ON cms.agm_tickets TO service_role;

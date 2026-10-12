-- Migration: create_core_member_accounts
--
-- Bridges `core.members` (the person) with `auth.users` (the login).
-- Every member CAN have exactly one account; not every member DOES —
-- new members enter the system unlinked until an admin sends an
-- invitation and the person claims it. Phase 1 §3.4.
--
-- Two lifecycle notes:
--
--   * `claim_status` reflects the invitation → claim → active journey:
--       not_invited → invited → claimed
--                              ↓
--                          disabled  (admin action; e.g. after departure)
--   * `member_id` is UNIQUE — the DB refuses to link the same person to
--     two auth users. `auth_user_id` is nullable because we can create
--     the mapping row *before* the auth.users row exists (an admin
--     enqueues an invitation; the auth user is created when the person
--     hits the magic link).

-------------------------------------------------------------------------------
-- 1. Enum: claim_status
-------------------------------------------------------------------------------

CREATE TYPE core.member_claim_status AS ENUM (
  'not_invited',
  'invited',
  'claimed',
  'disabled'
);

COMMENT ON TYPE core.member_claim_status IS
  'Invitation / claim lifecycle for a member''s login account. Not_invited is the default when the join row is created ahead of an invitation being sent.';

-------------------------------------------------------------------------------
-- 2. Table: core.member_accounts
-------------------------------------------------------------------------------

CREATE TABLE core.member_accounts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  member_id                UUID NOT NULL UNIQUE
                           REFERENCES core.members(id) ON DELETE CASCADE,
  auth_user_id             UUID UNIQUE
                           REFERENCES auth.users(id) ON DELETE SET NULL,

  claim_status             core.member_claim_status NOT NULL DEFAULT 'not_invited',

  invited_at               TIMESTAMPTZ,
  claimed_at               TIMESTAMPTZ,
  last_invitation_sent_at  TIMESTAMPTZ,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Claim consistency: `claimed_at` must accompany `claimed` status
  -- (and only that status). This catches the class of bugs where an
  -- invitation-response handler writes claimed_at but forgets to flip
  -- the enum, or vice-versa.
  CONSTRAINT member_accounts_claimed_at_matches_status
    CHECK (
      (claim_status = 'claimed' AND claimed_at IS NOT NULL AND auth_user_id IS NOT NULL)
      OR
      (claim_status <> 'claimed' AND claimed_at IS NULL)
    ),

  -- Invited consistency: if there's an invited_at timestamp, the status
  -- must be past the not_invited stage.
  CONSTRAINT member_accounts_invited_at_matches_status
    CHECK (
      invited_at IS NULL
      OR claim_status IN ('invited', 'claimed', 'disabled')
    )
);

COMMENT ON TABLE core.member_accounts IS
  'One row per member/auth-user link. Rows may exist without an auth_user_id (member invited but not yet claimed).';

CREATE TRIGGER member_accounts_set_updated_at
  BEFORE UPDATE ON core.member_accounts
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX member_accounts_auth_user_id_idx
  ON core.member_accounts (auth_user_id);
CREATE INDEX member_accounts_claim_status_idx
  ON core.member_accounts (claim_status);

-------------------------------------------------------------------------------
-- 3. RLS — enable with NO policies
-------------------------------------------------------------------------------

ALTER TABLE core.member_accounts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON core.member_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.member_accounts TO service_role;

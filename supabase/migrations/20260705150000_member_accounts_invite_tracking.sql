-- Migration: member_accounts_invite_tracking
--
-- 2026-07-05: batches are the single system entry-point for member
-- onboarding and every imported member gets an email invite (per the
-- 2026-07-05 lock). This migration extends `core.member_accounts` with
-- two columns to support the invite operational surface:
--
--   1. `resent_count INTEGER` — number of times the invite has been
--      re-sent from the Invites page's Resend action. Starts at 0.
--      NULL means "unknown history"; we default to 0 for clarity.
--
--   2. `invite_error TEXT` — captures the last Auth admin API error so
--      operators can see why an invite failed to dispatch (email already
--      registered, invalid address, etc.) without hunting through the
--      audit log. Cleared to NULL on a successful (re-)send.
--
-- Neither column changes existing behavior — the invite flow uses them,
-- but claims that already went through still land the same way.
--
-- Also adds the missing RLS SELECT policy on `core.member_accounts` so
-- admin surfaces (the Invites page, member profile) can read the row.
-- Before this migration the table was RLS-enabled with no policies,
-- meaning reads were denied. The policy admits any user who holds
-- `member.import` at ANY scope; this matches the sidebar rule for the
-- Invites entry.

ALTER TABLE core.member_accounts
  ADD COLUMN IF NOT EXISTS resent_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invite_error TEXT;

COMMENT ON COLUMN core.member_accounts.resent_count IS
  'Number of times the invite has been resent from the Invites page. Reset to 0 when a fresh invite goes out; incremented on each Resend action.';

COMMENT ON COLUMN core.member_accounts.invite_error IS
  'Last error message from the Supabase Auth admin API when attempting to send the invite. Cleared to NULL on a successful (re-)send.';

-- ─── RLS: admin-lens SELECT ─────────────────────────────────────────
-- Any user with an active `member.import` grant (at ANY scope) can
-- read every invite row. Matches how the sidebar decides visibility
-- for the Invites entry — a branch admin holding `member.import` at
-- their branch can see and act on invites for members they onboarded
-- via that branch's Batch cluster. Global mainstream_admin sees
-- everything via has_permission's NULL-scope pass.
--
-- Fine-grained "which invites can I see" (e.g. only my branch's
-- invites) is handled at the query layer in the Invites page by
-- filtering on batch_scope_id / branch context. RLS just gates the
-- outer visibility.

DROP POLICY IF EXISTS member_accounts_select ON core.member_accounts;

CREATE POLICY member_accounts_select ON core.member_accounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM core.role_assignments ra
      INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
      INNER JOIN core.permissions p ON p.id = rp.permission_id
      WHERE ra.user_id = auth.uid()
        AND p.key = 'member.import'
        AND ra.revoked_at IS NULL
        AND ra.starts_at <= NOW()
        AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
    )
  );

COMMENT ON POLICY member_accounts_select ON core.member_accounts IS
  'Admin-lens SELECT — any active member.import grant admits reads. Fine-grained scope filtering happens in the Invites page query, not the policy.';

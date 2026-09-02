-- Baseline 2/3 — application schema
--
-- The whole of `core`, `audit`, `notifications`, `exco`, `finance` and `cms`,
-- as built by the 112 migrations applied between 2026-06-29 and 2026-09-02.
-- Those files are archived under `supabase/migrations/_archive/` — kept in git
-- for history, out of the migration path.
--
-- ── How this was produced, and why it matters ───────────────────────────────
-- Generated with `pg_dump --schema-only`, NOT `supabase db dump`. The CLI's
-- dump silently omits triggers: it emitted zero of the 54 this schema relies
-- on. Shipping that would have produced a database with no payment or ledger
-- immutability, no audit append-only guard, no receipt generation, no
-- obligation-status recompute, no six-holder position cap and no last-admin
-- protection — every invariant the system depends on, quietly absent.
--
-- The baseline is verified by round trip: reset from these three files, dump
-- again, and diff against the dump of the 112-migration database. They match.
--
-- ── Reading this file ───────────────────────────────────────────────────────
-- It is machine-generated and dependency-ordered, so it does not carry the
-- narrative comments the originals had. When you need to know WHY something
-- is shaped the way it is, the archived migration that introduced it is still
-- the best explanation — they are unusually well commented. Object comments
-- (COMMENT ON ...) survived the dump and are inline below.
--
-- Do not hand-edit. Change the schema with a new migration on top.

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: audit; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA audit;


--
-- Name: SCHEMA audit; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA audit IS 'Cross-cutting append-only event log. Owned by Phase 0 (E4). Per-entity history tables live in their owning schemas (e.g. core.role_history) and reference audit_entries.';


--
-- Name: cms; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA cms;


--
-- Name: SCHEMA cms; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA cms IS 'Public-website content managed by the Editor persona. Independent of the operational membership + governance graph.';


--
-- Name: core; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA core;


--
-- Name: SCHEMA core; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA core IS 'Identity, members, scopes (org hierarchy), roles & permissions. Owned by Phase 0 (E2 + E3).';


--
-- Name: exco; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA exco;


--
-- Name: SCHEMA exco; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA exco IS 'Phase 2 governance flows: events, announcements, admin notifications, RSVPs, pledges. Same RLS + Edge Function authority pattern as core (per Phase 2 ADR-0037).';


--
-- Name: finance; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA finance;


--
-- Name: SCHEMA finance; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA finance IS 'Phase 3 finance module — charges, contributions, obligations, payments, ledger, treasury, expenses, exceptions, receipts, exchange rates. Full spec at docs/product/finance.md. Immutable ledger; append-only payments; batches never own a treasury.';


--
-- Name: notifications; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA notifications;


--
-- Name: SCHEMA notifications; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA notifications IS 'Outbound notification events + delivery attempts. Owned by Phase 0 (E6). Templates table deferred to Phase 6.';


--
-- Name: chapter_kind; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.chapter_kind AS ENUM (
    'autonomous',
    'grouping'
);


--
-- Name: TYPE chapter_kind; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TYPE core.chapter_kind IS 'Chapter classification per Phase 1 §2.5: autonomous chapters hold direct memberships and treasury; grouping chapters only tag members whose real membership is at the parent branch.';


--
-- Name: engagement_tier; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.engagement_tier AS ENUM (
    'dormant',
    'normal',
    'engaged',
    'committed',
    'pillar'
);


--
-- Name: TYPE engagement_tier; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TYPE core.engagement_tier IS 'Manual admin-set devotion tier on a membership. Ordered ladder: dormant < normal < engaged < committed. Default normal on entry. Orthogonal to membership_status; never derived from finance.';


--
-- Name: import_batch_status; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.import_batch_status AS ENUM (
    'uploaded',
    'validated',
    'confirmed',
    'cancelled',
    'failed'
);


--
-- Name: TYPE import_batch_status; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TYPE core.import_batch_status IS 'Lifecycle of a member import batch. Transitions:
     uploaded → validated  (validate-member-import Edge Function)
     validated → confirmed (confirm-member-import Edge Function, idempotent)
     uploaded|validated → cancelled (admin dismiss)
     any → failed (parse blew up)';


--
-- Name: import_row_status; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.import_row_status AS ENUM (
    'pending',
    'valid',
    'invalid',
    'duplicate',
    'skipped',
    'created'
);


--
-- Name: TYPE import_row_status; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TYPE core.import_row_status IS 'Per-row state within an import batch. Duplicate is a soft-warning
   status — the operator can promote to valid via a force override in
   the review UI. Created is set on confirm when a member row was
   actually written.';


--
-- Name: member_claim_status; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.member_claim_status AS ENUM (
    'not_invited',
    'invited',
    'claimed',
    'disabled'
);


--
-- Name: TYPE member_claim_status; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TYPE core.member_claim_status IS 'Invitation / claim lifecycle for a member''s login account. Not_invited is the default when the join row is created ahead of an invitation being sent.';


--
-- Name: member_status; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.member_status AS ENUM (
    'active',
    'deceased'
);


--
-- Name: TYPE member_status; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TYPE core.member_status IS 'Person-level status. Passive/transferred/left belong to core.memberships (E1.4) because they describe the member''s relationship to a body, not the person themselves. Deceased triggers a cascade of memberships → left (in the E1.4 trigger).';


--
-- Name: membership_join_method; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.membership_join_method AS ENUM (
    'self_request',
    'admin_added',
    'import',
    'transfer'
);


--
-- Name: TYPE membership_join_method; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TYPE core.membership_join_method IS 'How the membership row was created. Useful for audit / analytics.';


--
-- Name: membership_status; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.membership_status AS ENUM (
    'pending',
    'active',
    'passive',
    'transferred',
    'left',
    'rejected'
);


--
-- Name: TYPE membership_status; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TYPE core.membership_status IS 'Membership lifecycle per Phase 1 §2.15. Passive applies only to geographic (branch/autonomous-chapter) memberships.';


--
-- Name: membership_transfer_status; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.membership_transfer_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
);


--
-- Name: scope_status; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.scope_status AS ENUM (
    'active',
    'inactive',
    'archived'
);


--
-- Name: TYPE scope_status; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TYPE core.scope_status IS 'Soft-delete state for scopes. `active` = normal; `inactive` = temporarily paused (dues collection halted, admins can restore); `archived` = permanently retired (kept for referential integrity + audit). Hard DELETE is never used — spec 2026-07-02.';


--
-- Name: scope_type; Type: TYPE; Schema: core; Owner: -
--

CREATE TYPE core.scope_type AS ENUM (
    'mainstream',
    'branch',
    'chapter',
    'batch',
    'house',
    'network'
);


--
-- Name: announcement_channel; Type: TYPE; Schema: exco; Owner: -
--

CREATE TYPE exco.announcement_channel AS ENUM (
    'in_app',
    'email',
    'forum'
);


--
-- Name: TYPE announcement_channel; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TYPE exco.announcement_channel IS 'Delivery channels selectable at publish. in_app is always included (a CHECK constraint enforces its presence). email and forum are toggles.';


--
-- Name: announcement_status; Type: TYPE; Schema: exco; Owner: -
--

CREATE TYPE exco.announcement_status AS ENUM (
    'draft',
    'scheduled',
    'published',
    'unpublished',
    'archived'
);


--
-- Name: TYPE announcement_status; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TYPE exco.announcement_status IS 'Lifecycle: draft → scheduled → published → unpublished/archived. Same shape will be reused by exco.events.';


--
-- Name: event_status; Type: TYPE; Schema: exco; Owner: -
--

CREATE TYPE exco.event_status AS ENUM (
    'draft',
    'scheduled',
    'published',
    'unpublished',
    'archived'
);


--
-- Name: TYPE event_status; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TYPE exco.event_status IS 'Event lifecycle. Draft → Scheduled → Published → Unpublished / Archived.';


--
-- Name: event_type; Type: TYPE; Schema: exco; Owner: -
--

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


--
-- Name: TYPE event_type; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TYPE exco.event_type IS 'Event tags. Multi-tag: an event carries exco.event_type[]. Filters use ANY / && overlap.';


--
-- Name: reminder_cadence; Type: TYPE; Schema: exco; Owner: -
--

CREATE TYPE exco.reminder_cadence AS ENUM (
    'weekly',
    'biweekly',
    'monthly'
);


--
-- Name: TYPE reminder_cadence; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TYPE exco.reminder_cadence IS 'Reminder emission cadence for events. Reminders auto-stop at the event start date.';


--
-- Name: rsvp_response; Type: TYPE; Schema: exco; Owner: -
--

CREATE TYPE exco.rsvp_response AS ENUM (
    'interested',
    'going'
);


--
-- Name: TYPE rsvp_response; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TYPE exco.rsvp_response IS 'Member RSVP response. Locked pair — new values require an ADR + migration.';


--
-- Name: charge_recurrence; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.charge_recurrence AS ENUM (
    'one_time',
    'monthly',
    'quarterly',
    'biannual',
    'yearly'
);


--
-- Name: charge_shape; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.charge_shape AS ENUM (
    'charge',
    'goal',
    'open',
    'ticketed',
    'fixed',
    'donation'
);


--
-- Name: charge_status; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.charge_status AS ENUM (
    'draft',
    'active',
    'paused',
    'archived'
);


--
-- Name: contribution_lifecycle; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.contribution_lifecycle AS ENUM (
    'draft',
    'open',
    'closed',
    'archived'
);


--
-- Name: exception_form; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.exception_form AS ENUM (
    'relative',
    'fixed',
    'senior',
    'individual'
);


--
-- Name: expense_status; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.expense_status AS ENUM (
    'recorded',
    'pending_approval',
    'approved'
);


--
-- Name: ledger_direction; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.ledger_direction AS ENUM (
    'income',
    'expense'
);


--
-- Name: obligation_status; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.obligation_status AS ENUM (
    'open',
    'partial',
    'paid',
    'cancelled',
    'forgiven'
);


--
-- Name: party_type; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.party_type AS ENUM (
    'member',
    'branch'
);


--
-- Name: payment_intent_status; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.payment_intent_status AS ENUM (
    'pending',
    'succeeded',
    'failed',
    'cancelled',
    'expired'
);


--
-- Name: payment_method; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.payment_method AS ENUM (
    'mtn_momo',
    'orange_money',
    'cash',
    'bank_transfer',
    'card'
);


--
-- Name: payment_source; Type: TYPE; Schema: finance; Owner: -
--

CREATE TYPE finance.payment_source AS ENUM (
    'auto',
    'manual'
);


--
-- Name: audit_entries_block_mutation(); Type: FUNCTION; Schema: audit; Owner: -
--

CREATE FUNCTION audit.audit_entries_block_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'audit.audit_entries is append-only (% blocked)', TG_OP
    USING ERRCODE = '42501',
          HINT = 'Audit entries cannot be modified or deleted. Add a new entry instead.';
END;
$$;


--
-- Name: log_event(text, text, text, uuid, uuid, jsonb, inet, text); Type: FUNCTION; Schema: audit; Owner: -
--

CREATE FUNCTION audit.log_event(p_action text, p_entity_schema text, p_entity_table text, p_entity_id uuid DEFAULT NULL::uuid, p_scope_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT '{}'::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  IF p_action IS NULL OR p_entity_schema IS NULL OR p_entity_table IS NULL THEN
    RAISE EXCEPTION 'log_event: action, entity_schema, entity_table are required'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO audit.audit_entries (
    actor_user_id, action,
    entity_schema, entity_table, entity_id,
    scope_id, metadata,
    ip_address, user_agent
  )
  VALUES (
    auth.uid(),  -- NULL when no JWT context (system jobs); captured otherwise
    p_action,
    p_entity_schema, p_entity_table, p_entity_id,
    p_scope_id, COALESCE(p_metadata, '{}'::jsonb),
    p_ip_address, p_user_agent
  )
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;


--
-- Name: FUNCTION log_event(p_action text, p_entity_schema text, p_entity_table text, p_entity_id uuid, p_scope_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text); Type: COMMENT; Schema: audit; Owner: -
--

COMMENT ON FUNCTION audit.log_event(p_action text, p_entity_schema text, p_entity_table text, p_entity_id uuid, p_scope_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text) IS 'Canonical write path for audit entries. SECURITY DEFINER so callers do not need direct INSERT on audit.audit_entries. Captures actor_user_id from JWT context automatically.';


--
-- Name: consume_submission_slot(text, integer, integer); Type: FUNCTION; Schema: cms; Owner: -
--

CREATE FUNCTION cms.consume_submission_slot(p_bucket_key text, p_limit integer DEFAULT 5, p_window_seconds integer DEFAULT 3600) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'cms', 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_bucket_key IS NULL OR length(p_bucket_key) = 0 THEN
    -- No key means we cannot attribute the request. Fail closed.
    RETURN FALSE;
  END IF;
  IF p_limit <= 0 OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'limit and window must be positive' USING ERRCODE = '22023';
  END IF;

  INSERT INTO cms.submission_throttle AS t (bucket_key, window_start, hit_count, updated_at)
  VALUES (p_bucket_key, NOW(), 1, NOW())
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      -- Window expired → start a fresh one at 1. Otherwise increment.
      window_start = CASE
        WHEN t.window_start < NOW() - make_interval(secs => p_window_seconds)
          THEN NOW()
        ELSE t.window_start
      END,
      hit_count = CASE
        WHEN t.window_start < NOW() - make_interval(secs => p_window_seconds)
          THEN 1
        ELSE t.hit_count + 1
      END,
      updated_at = NOW()
  RETURNING t.hit_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;


--
-- Name: FUNCTION consume_submission_slot(p_bucket_key text, p_limit integer, p_window_seconds integer); Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON FUNCTION cms.consume_submission_slot(p_bucket_key text, p_limit integer, p_window_seconds integer) IS 'Atomically consumes one slot in a fixed window. TRUE = proceed, FALSE = rate limited. Fails closed on a missing key.';


--
-- Name: prune_submission_throttle(integer); Type: FUNCTION; Schema: cms; Owner: -
--

CREATE FUNCTION cms.prune_submission_throttle(p_older_than_seconds integer DEFAULT 86400) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'cms', 'public'
    AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM cms.submission_throttle
   WHERE window_start < NOW() - make_interval(secs => p_older_than_seconds);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


--
-- Name: submit_agm_registration(text, text, text, numeric, text, text, integer, text, text); Type: FUNCTION; Schema: cms; Owner: -
--

CREATE FUNCTION cms.submit_agm_registration(p_kind text, p_full_name text, p_phone text, p_amount_xaf numeric, p_payment_method text, p_email text DEFAULT NULL::text, p_quantity integer DEFAULT NULL::integer, p_attire_size text DEFAULT NULL::text, p_note text DEFAULT NULL::text) RETURNS TABLE(reference text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'cms', 'public'
    AS $$
DECLARE
  v_reference TEXT;
BEGIN
  IF p_full_name IS NULL OR length(trim(p_full_name)) < 2 THEN
    RAISE EXCEPTION 'full_name is required' USING ERRCODE = '22023';
  END IF;

  -- Phone is mandatory. Enforced here as well as in the form and the
  -- server action, so the rule holds against a direct RPC call.
  IF p_phone IS NULL OR length(trim(p_phone)) < 9 THEN
    RAISE EXCEPTION 'phone is required' USING ERRCODE = '22023';
  END IF;

  IF p_kind NOT IN ('ticket', 'attire', 'donation') THEN
    RAISE EXCEPTION 'unknown registration kind' USING ERRCODE = '22023';
  END IF;

  IF p_amount_xaf IS NULL OR p_amount_xaf <= 0 THEN
    RAISE EXCEPTION 'amount must be positive' USING ERRCODE = '22023';
  END IF;

  -- Ceilings mirror the table CHECKs so a bad request fails with a
  -- readable message rather than a raw check_violation.
  IF p_quantity IS NOT NULL AND (p_quantity <= 0 OR p_quantity > 20) THEN
    RAISE EXCEPTION 'quantity must be between 1 and 20' USING ERRCODE = '22023';
  END IF;

  v_reference := 'AGM-' || upper(substring(replace(gen_random_uuid()::text, '-', '') FOR 10));

  INSERT INTO cms.agm_registrations
    (reference, kind, full_name, email, phone,
     quantity, amount_xaf, attire_size, payment_method, note)
  VALUES
    (v_reference, p_kind, trim(p_full_name), nullif(trim(coalesce(p_email, '')), ''), trim(p_phone),
     p_quantity, p_amount_xaf, p_attire_size, p_payment_method,
     nullif(trim(coalesce(p_note, '')), ''));

  RETURN QUERY SELECT v_reference;
END;
$$;


--
-- Name: FUNCTION submit_agm_registration(p_kind text, p_full_name text, p_phone text, p_amount_xaf numeric, p_payment_method text, p_email text, p_quantity integer, p_attire_size text, p_note text); Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON FUNCTION cms.submit_agm_registration(p_kind text, p_full_name text, p_phone text, p_amount_xaf numeric, p_payment_method text, p_email text, p_quantity integer, p_attire_size text, p_note text) IS 'The only public write path for AGM 2026 submissions. SECURITY DEFINER, anon-executable, and reachable surface is one INSERT into cms.agm_registrations. Creates no payment, receipt or ledger entry.';


--
-- Name: can_read_member_via_attribute(uuid, uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.can_read_member_via_attribute(p_member_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_batch    UUID;
  v_house    UUID;
  v_network  UUID;
BEGIN
  IF p_member_id IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT batch_scope_id, house_scope_id, network_scope_id
    INTO v_batch, v_house, v_network
  FROM core.members
  WHERE id = p_member_id;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  RETURN
    (v_batch   IS NOT NULL AND core.has_permission(p_user_id, v_batch,   'member.read')) OR
    (v_house   IS NOT NULL AND core.has_permission(p_user_id, v_house,   'member.read')) OR
    (v_network IS NOT NULL AND core.has_permission(p_user_id, v_network, 'member.read'));
END;
$$;


--
-- Name: FUNCTION can_read_member_via_attribute(p_member_id uuid, p_user_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.can_read_member_via_attribute(p_member_id uuid, p_user_id uuid) IS 'Returns TRUE if the caller has member.read at the member''s batch, house, or network scope. Complements can_read_member_via_membership for scope types (batch/house/network) that link members by attribute rather than by membership row.';


--
-- Name: can_read_member_via_membership(uuid, uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.can_read_member_via_membership(p_member_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_hit BOOLEAN;
BEGIN
  IF p_member_id IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM core.memberships m
    WHERE m.member_id = p_member_id
      -- 'pending' added 2026-07-03 so admins approving join requests
      -- can see the requester's name/email in the queue.
      AND m.membership_status IN ('active', 'passive', 'pending')
      AND core.has_permission(p_user_id, m.scope_id, 'member.read')
  )
  INTO v_hit;

  RETURN COALESCE(v_hit, FALSE);
END;
$$;


--
-- Name: FUNCTION can_read_member_via_membership(p_member_id uuid, p_user_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.can_read_member_via_membership(p_member_id uuid, p_user_id uuid) IS 'Returns TRUE if the caller has member.read at any scope where the target member holds an active / passive / pending membership. Pending is included so admins can see the members behind join-request queues.';


--
-- Name: can_read_member_via_transfer(uuid, uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.can_read_member_via_transfer(p_member_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_hit BOOLEAN;
BEGIN
  IF p_member_id IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT EXISTS (
    SELECT 1
    FROM core.membership_transfers t
    WHERE t.member_id = p_member_id
      AND t.status = 'pending'
      AND (
        core.has_permission(p_user_id, t.destination_scope_id, 'member.read')
        OR core.has_permission(p_user_id, t.source_scope_id, 'member.read')
      )
  )
  INTO v_hit;

  RETURN COALESCE(v_hit, FALSE);
END;
$$;


--
-- Name: FUNCTION can_read_member_via_transfer(p_member_id uuid, p_user_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.can_read_member_via_transfer(p_member_id uuid, p_user_id uuid) IS 'Returns TRUE if the caller has member.read at either the source or destination of a pending transfer for the member. Enables destination-scope admins to see the requesters in their Transfers queue (2026-07-03 flip: destination approves).';


--
-- Name: can_read_membership_via_member_attribute(uuid, uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.can_read_membership_via_member_attribute(p_member_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_batch    UUID;
  v_house    UUID;
  v_network  UUID;
BEGIN
  IF p_member_id IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT batch_scope_id, house_scope_id, network_scope_id
    INTO v_batch, v_house, v_network
  FROM core.members
  WHERE id = p_member_id;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  RETURN
    (v_batch   IS NOT NULL AND core.has_permission(p_user_id, v_batch,   'member.read')) OR
    (v_house   IS NOT NULL AND core.has_permission(p_user_id, v_house,   'member.read')) OR
    (v_network IS NOT NULL AND core.has_permission(p_user_id, v_network, 'member.read'));
END;
$$;


--
-- Name: FUNCTION can_read_membership_via_member_attribute(p_member_id uuid, p_user_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.can_read_membership_via_member_attribute(p_member_id uuid, p_user_id uuid) IS 'Returns TRUE if the caller has member.read at any of the target membership''s member''s attribute scopes (batch/house/network). Grants read visibility on a member''s memberships to admins at the member''s batch / house / network without granting write access.';


--
-- Name: can_view_role_history(uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.can_view_role_history(p_role_assignment_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_scope_id UUID;
  v_user_id  UUID;
BEGIN
  IF p_role_assignment_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT scope_id, user_id
    INTO v_scope_id, v_user_id
  FROM core.role_assignments
  WHERE id = p_role_assignment_id;

  -- Subject of the assignment can always see their own history.
  -- audit.read holders see history at the assignment's scope (and
  -- ancestors via has_permission's traversal).
  RETURN v_user_id = auth.uid()
      OR core.has_permission(auth.uid(), v_scope_id, 'audit.read');
END;
$$;


--
-- Name: FUNCTION can_view_role_history(p_role_assignment_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.can_view_role_history(p_role_assignment_id uuid) IS 'RLS helper for core.role_history SELECT. Returns TRUE if the caller is the assignment subject OR has audit.read at the assignment scope.';


--
-- Name: change_chapter_autonomy(uuid, core.chapter_kind); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.change_chapter_autonomy(p_scope_id uuid, p_new_kind core.chapter_kind) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public', 'auth'
    AS $$
DECLARE
  v_current_kind         core.chapter_kind;
  v_membership_count     INTEGER;
BEGIN
  SELECT chapter_kind INTO v_current_kind
  FROM core.scopes
  WHERE id = p_scope_id AND scope_type = 'chapter';

  IF v_current_kind IS NULL THEN
    RAISE EXCEPTION 'chapter % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  -- No-op guard.
  IF v_current_kind = p_new_kind THEN
    RETURN;
  END IF;

  -- The dangerous direction: demoting a body into a tag. Refuse if
  -- the chapter still owns memberships. Also clears finance/contact
  -- slots so the grouping-shape trigger doesn't reject the row.
  IF v_current_kind = 'autonomous' AND p_new_kind = 'grouping' THEN
    SELECT COUNT(*) INTO v_membership_count
    FROM core.memberships
    WHERE scope_id = p_scope_id
      AND membership_status IN ('active', 'passive', 'pending');

    IF v_membership_count > 0 THEN
      RAISE EXCEPTION 'cannot demote autonomous chapter to grouping while % member(s) attached', v_membership_count
        USING ERRCODE = '23514',
              HINT = 'Transfer or close their memberships to the parent branch first.';
    END IF;

    -- TODO(finance): also block if finance.* rows reference this scope.

    UPDATE core.chapters
       SET registration_fee_required = FALSE,
           registration_fee_amount   = NULL,
           registration_fee_currency = NULL,
           contact_email             = NULL,
           contact_phone             = NULL
     WHERE scope_id = p_scope_id;
  END IF;

  UPDATE core.scopes
     SET chapter_kind = p_new_kind
   WHERE id = p_scope_id;
END;
$$;


--
-- Name: FUNCTION change_chapter_autonomy(p_scope_id uuid, p_new_kind core.chapter_kind); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.change_chapter_autonomy(p_scope_id uuid, p_new_kind core.chapter_kind) IS 'Flip chapter_kind with the autonomous → grouping guard (blocks when memberships attached). Called only by the set-chapter-autonomy Edge Function which requires scope.change_autonomy at the chapter.';


--
-- Name: chapters_enforce_grouping_shape(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.chapters_enforce_grouping_shape() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_kind core.chapter_kind;
BEGIN
  SELECT chapter_kind INTO v_kind
  FROM core.scopes
  WHERE id = NEW.scope_id;

  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'chapters row references a scope with no chapter_kind (scope_id %)', NEW.scope_id
      USING ERRCODE = '23514';
  END IF;

  IF v_kind = 'grouping' THEN
    IF NEW.registration_fee_required
       OR NEW.registration_fee_amount IS NOT NULL
       OR NEW.registration_fee_currency IS NOT NULL
       OR NEW.contact_email IS NOT NULL
       OR NEW.contact_phone IS NOT NULL
    THEN
      RAISE EXCEPTION 'grouping chapters cannot carry registration or contact fields'
        USING ERRCODE = '23514',
              HINT = 'Promote the chapter to autonomous first, or clear the offending fields.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION chapters_enforce_grouping_shape(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.chapters_enforce_grouping_shape() IS 'BEFORE trigger: grouping chapters must keep registration + contact fields empty. Autonomy is the master switch.';


--
-- Name: create_batch(text, text, integer, integer, text, text, text, text, jsonb); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.create_batch(p_name text, p_slug text, p_entry_year integer, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public', 'auth'
    AS $$
DECLARE
  v_mainstream_id UUID;
  v_scope_id      UUID;
BEGIN
  SELECT id INTO v_mainstream_id FROM core.scopes WHERE scope_type = 'mainstream';
  IF v_mainstream_id IS NULL THEN
    RAISE EXCEPTION 'no mainstream scope found — seed has not run';
  END IF;

  INSERT INTO core.scopes (
    name, slug, scope_type, parent_scope_id, entry_year, currency_code, metadata, created_by
  ) VALUES (
    p_name, p_slug, 'batch', v_mainstream_id, p_entry_year, 'XAF', p_metadata, auth.uid()
  )
  RETURNING id INTO v_scope_id;

  INSERT INTO core.batches (
    scope_id, ordinal, nickname, description, contact_email, contact_phone, created_by
  ) VALUES (
    v_scope_id, p_ordinal, p_nickname, p_description, p_contact_email, p_contact_phone, auth.uid()
  );

  RETURN v_scope_id;
END;
$$;


--
-- Name: FUNCTION create_batch(p_name text, p_slug text, p_entry_year integer, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_metadata jsonb); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.create_batch(p_name text, p_slug text, p_entry_year integer, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_metadata jsonb) IS 'Atomic scopes + batches insert. SECURITY DEFINER — Edge Function must clear scope.create at Mainstream first.';


--
-- Name: create_branch(text, text, text, text, text, text, text, text, boolean, numeric, text, text, text, jsonb); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.create_branch(p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public', 'auth'
    AS $$
DECLARE
  v_mainstream_id UUID;
  v_scope_id      UUID;
BEGIN
  SELECT id INTO v_mainstream_id FROM core.scopes WHERE scope_type = 'mainstream';
  IF v_mainstream_id IS NULL THEN
    RAISE EXCEPTION 'no mainstream scope found — seed has not run';
  END IF;

  INSERT INTO core.scopes (
    name, slug, scope_type, parent_scope_id, currency_code, metadata, created_by
  ) VALUES (
    p_name, p_slug, 'branch', v_mainstream_id,
    UPPER(p_currency_code), p_metadata, auth.uid()
  )
  RETURNING id INTO v_scope_id;

  INSERT INTO core.branches (
    scope_id,
    country_code, region, city,
    nickname, description,
    registration_fee_required, registration_fee_amount, registration_fee_currency,
    contact_email, contact_phone
  ) VALUES (
    v_scope_id,
    UPPER(p_country_code), p_region, p_city,
    p_nickname, p_description,
    COALESCE(p_registration_fee_required, FALSE),
    p_registration_fee_amount,
    NULLIF(UPPER(COALESCE(p_registration_fee_currency, '')), ''),
    p_contact_email, p_contact_phone
  );

  RETURN v_scope_id;
END;
$$;


--
-- Name: FUNCTION create_branch(p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.create_branch(p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb) IS 'Atomic scopes + branches insert. SECURITY DEFINER — the caller must have already cleared scope.create at Mainstream via the Edge Function.';


--
-- Name: create_chapter(uuid, core.chapter_kind, text, text, text, text, text, text, text, text, boolean, numeric, text, text, text, jsonb); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.create_chapter(p_parent_branch_id uuid, p_chapter_kind core.chapter_kind, p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public', 'auth'
    AS $$
DECLARE
  v_parent_type core.scope_type;
  v_currency    TEXT;
  v_scope_id    UUID;
BEGIN
  SELECT scope_type, currency_code INTO v_parent_type, v_currency
  FROM core.scopes
  WHERE id = p_parent_branch_id;

  IF v_parent_type IS DISTINCT FROM 'branch' THEN
    RAISE EXCEPTION 'chapter parent must be a branch (got %)', COALESCE(v_parent_type::TEXT, 'null')
      USING ERRCODE = '23503';
  END IF;

  IF p_chapter_kind = 'autonomous' AND (p_currency_code IS NULL OR p_currency_code = '') THEN
    RAISE EXCEPTION 'autonomous chapters require a currency_code'
      USING ERRCODE = '23514';
  END IF;

  -- Grouping chapters inherit the parent branch currency for the row
  -- (unused by any code path but keeps the NOT NULL constraint happy
  -- and gives a sensible value if we ever surface it).
  IF p_chapter_kind = 'grouping' THEN
    v_currency := v_currency;
  ELSE
    v_currency := UPPER(p_currency_code);
  END IF;

  INSERT INTO core.scopes (
    name, slug, scope_type, parent_scope_id, chapter_kind,
    currency_code, metadata, created_by
  ) VALUES (
    p_name, p_slug, 'chapter', p_parent_branch_id, p_chapter_kind,
    v_currency, p_metadata, auth.uid()
  )
  RETURNING id INTO v_scope_id;

  INSERT INTO core.chapters (
    scope_id,
    country_code, region, city,
    nickname, description,
    registration_fee_required, registration_fee_amount, registration_fee_currency,
    contact_email, contact_phone
  ) VALUES (
    v_scope_id,
    UPPER(p_country_code), p_region, p_city,
    p_nickname, p_description,
    CASE WHEN p_chapter_kind = 'autonomous'
         THEN COALESCE(p_registration_fee_required, FALSE)
         ELSE FALSE
    END,
    CASE WHEN p_chapter_kind = 'autonomous' THEN p_registration_fee_amount ELSE NULL END,
    CASE WHEN p_chapter_kind = 'autonomous'
         THEN NULLIF(UPPER(COALESCE(p_registration_fee_currency, '')), '')
         ELSE NULL
    END,
    CASE WHEN p_chapter_kind = 'autonomous' THEN p_contact_email ELSE NULL END,
    CASE WHEN p_chapter_kind = 'autonomous' THEN p_contact_phone ELSE NULL END
  );

  RETURN v_scope_id;
END;
$$;


--
-- Name: FUNCTION create_chapter(p_parent_branch_id uuid, p_chapter_kind core.chapter_kind, p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.create_chapter(p_parent_branch_id uuid, p_chapter_kind core.chapter_kind, p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb) IS 'Atomic scopes + chapters insert. SECURITY DEFINER — caller must clear scope.create at the parent branch via the Edge Function.';


--
-- Name: create_network(text, text, text, text, text, text, integer, jsonb); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.create_network(p_name text, p_slug text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public', 'auth'
    AS $$
DECLARE
  v_mainstream_id UUID;
  v_scope_id      UUID;
BEGIN
  SELECT id INTO v_mainstream_id FROM core.scopes WHERE scope_type = 'mainstream';
  IF v_mainstream_id IS NULL THEN
    RAISE EXCEPTION 'no mainstream scope found — seed has not run';
  END IF;

  INSERT INTO core.scopes (
    name, slug, scope_type, parent_scope_id, currency_code, metadata, created_by
  ) VALUES (
    p_name, p_slug, 'network', v_mainstream_id, 'XAF', p_metadata, auth.uid()
  )
  RETURNING id INTO v_scope_id;

  INSERT INTO core.networks (
    scope_id, short_name, description, icon, color_hex, sort_order
  ) VALUES (
    v_scope_id, p_short_name, p_description, p_icon, p_color_hex,
    COALESCE(p_sort_order, 0)
  );

  RETURN v_scope_id;
END;
$$;


--
-- Name: FUNCTION create_network(p_name text, p_slug text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_metadata jsonb); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.create_network(p_name text, p_slug text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_metadata jsonb) IS 'Atomic scopes + networks insert. SECURITY DEFINER — the caller must have already cleared scope.create at Mainstream via the Edge Function''s authorize() check.';


--
-- Name: enforce_currency_immutable_once_used(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.enforce_currency_immutable_once_used() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public'
    AS $_$
DECLARE
  v_has_financial_history BOOLEAN := FALSE;
  v_table                 TEXT;
  v_col                   TEXT;
  v_sql                   TEXT;
  v_scope_id              UUID;
  financial_tables        TEXT[][] := ARRAY[
    ARRAY['finance.charges',           'scope_id'],
    ARRAY['finance.obligations',       'scope_id'],
    ARRAY['finance.payments',          'scope_id'],
    ARRAY['finance.ledger_entries',    'scope_id'],
    ARRAY['finance.expenses',          'scope_id'],
    ARRAY['finance.treasury_balances', 'scope_id']
  ];
BEGIN
  IF NEW.currency_code IS NOT DISTINCT FROM OLD.currency_code THEN
    RETURN NEW;
  END IF;

  -- Which UUID to check against the finance tables depends on which
  -- table the trigger is attached to.
  IF TG_TABLE_SCHEMA = 'core' AND TG_TABLE_NAME = 'scopes' THEN
    v_scope_id := NEW.id;
  ELSE
    v_scope_id := NEW.scope_id;
  END IF;

  FOR i IN 1 .. array_length(financial_tables, 1)
  LOOP
    v_table := financial_tables[i][1];
    v_col   := financial_tables[i][2];

    CONTINUE WHEN to_regclass(v_table) IS NULL;

    v_sql := format(
      'SELECT EXISTS (SELECT 1 FROM %s WHERE %I = $1)',
      v_table, v_col
    );
    EXECUTE v_sql INTO v_has_financial_history USING v_scope_id;

    IF v_has_financial_history THEN
      RAISE EXCEPTION
        'currency_code is immutable once financial records exist (scope % has rows in %)',
        v_scope_id, v_table
        USING ERRCODE = '23514',
              HINT = 'Retire the scope and create a fresh one in the new currency instead of mutating in place.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$_$;


--
-- Name: FUNCTION enforce_currency_immutable_once_used(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.enforce_currency_immutable_once_used() IS 'Shared BEFORE UPDATE trigger fn. Blocks currency_code changes when any finance table already references the scope. Attach with CREATE TRIGGER ... BEFORE UPDATE OF currency_code ON <table>. The financial_tables array inside is the source of truth for which tables gate a change — extend as finance schemas land.';


--
-- Name: enforce_last_admin_protection(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.enforce_last_admin_protection() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_role_key         TEXT;
  v_old_active       BOOLEAN;
  v_new_active       BOOLEAN;
  v_caller_uuid      UUID;
  v_active_after     INTEGER;
BEGIN
  -- Global grants (Recruiter) are exempt — Recruiter isn't an admin
  -- role, and scope_id IS NULL wouldn't map to a per-body count.
  IF COALESCE(NEW.scope_id, OLD.scope_id) IS NULL THEN
    RETURN NEW;
  END IF;

  -- What role key is this? Read via role_id → key.
  SELECT key INTO v_role_key
  FROM core.roles
  WHERE id = COALESCE(NEW.role_id, OLD.role_id);

  IF NOT core.is_admin_role_key(v_role_key) THEN
    RETURN NEW;
  END IF;

  -- Determine "was active" and "will be active" for this row.
  v_old_active := (TG_OP = 'UPDATE')
    AND OLD.revoked_at IS NULL
    AND OLD.starts_at <= NOW()
    AND (OLD.ends_at IS NULL OR OLD.ends_at > NOW());

  v_new_active := NEW.revoked_at IS NULL
    AND NEW.starts_at <= NOW()
    AND (NEW.ends_at IS NULL OR NEW.ends_at > NOW());

  -- Only care about transitions that DEACTIVATE an admin grant.
  -- INSERTs of active grants (new admin) never trip the rule.
  IF v_new_active THEN
    RETURN NEW;
  END IF;

  -- On UPDATE that's transitioning OLD-active → NEW-inactive, this
  -- is where self-revoke and last-admin checks fire.
  IF TG_OP <> 'UPDATE' OR NOT v_old_active THEN
    RETURN NEW;
  END IF;

  -- Self-revoke guard: the caller cannot revoke their own admin.
  -- auth.uid() is available inside triggers when the mutation carries
  -- a user JWT; NULL for service-role / direct SQL, which is expected
  -- to bypass this rule (bootstrap scripts, tests).
  v_caller_uuid := auth.uid();
  IF v_caller_uuid IS NOT NULL AND v_caller_uuid = NEW.user_id THEN
    RAISE EXCEPTION 'LAST_ADMIN: cannot self-revoke your own admin role at scope %', NEW.scope_id
      USING ERRCODE = '23514',
            HINT = 'Ask another admin to revoke your role.';
  END IF;

  -- Zero-admin guard: count remaining active admin holders at scope
  -- AFTER this row deactivates.
  SELECT COUNT(*)
    INTO v_active_after
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
   WHERE ra.scope_id = NEW.scope_id
     AND ra.id <> NEW.id
     AND core.is_admin_role_key(r.key)
     AND ra.revoked_at IS NULL
     AND ra.starts_at <= NOW()
     AND (ra.ends_at IS NULL OR ra.ends_at > NOW());

  IF v_active_after = 0 THEN
    RAISE EXCEPTION 'LAST_ADMIN: cannot revoke the last active admin at scope %', NEW.scope_id
      USING ERRCODE = '23514',
            HINT = 'Grant admin to another user at this scope first, then revoke this one.';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION enforce_last_admin_protection(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.enforce_last_admin_protection() IS 'Phase 2 §6.1 + §13 — blocks self-revoke of admin AND blocks any operation that would leave a scope with zero active mainstream_admin/branch_admin/batch_admin holders. Raises 23514 with LAST_ADMIN: prefix.';


--
-- Name: enforce_six_holder_cap(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.enforce_six_holder_cap() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_role_key TEXT;
  v_count    INTEGER;
BEGIN
  IF NEW.scope_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT key INTO v_role_key FROM core.roles WHERE id = NEW.role_id;
  IF v_role_key NOT IN ('mainstream_admin', 'branch_admin', 'finance') THEN
    RETURN NEW;
  END IF;

  IF NEW.revoked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.ends_at IS NOT NULL AND NEW.ends_at <= NOW() THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('role_assignments_cap:' || NEW.scope_id::text));

  SELECT COUNT(*)
    INTO v_count
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
   WHERE ra.scope_id = NEW.scope_id
     AND r.key IN ('mainstream_admin', 'branch_admin', 'finance')
     AND ra.revoked_at IS NULL
     AND ra.starts_at <= NOW()
     AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
     AND ra.id IS DISTINCT FROM NEW.id;

  IF v_count + 1 > 6 THEN
    RAISE EXCEPTION 'CAP_EXCEEDED: admin+finance cap of 6 exceeded at scope %', NEW.scope_id
      USING ERRCODE = '23514',
            HINT = 'Revoke an existing admin or finance holder at this scope before granting another.';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION enforce_six_holder_cap(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.enforce_six_holder_cap() IS 'Phase 1 §2.18 backstop: rejects INSERT/UPDATE that would push the (admin + finance) grant count for the row''s scope over 6. Post 2026-07-05: counted roles are {mainstream_admin, branch_admin, finance} only.';


--
-- Name: get_user_grants(uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.get_user_grants(p_user_id uuid) RETURNS TABLE(scope_id uuid, scope_type text, scope_name text, role_key text, permission_keys text[])
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
BEGIN
  -- Self-introspection guard, same shape as has_permission.
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'get_user_grants: cannot list another user''s grants'
      USING ERRCODE = '42501',
            HINT = 'auth.uid() does not match p_user_id; only service_role may probe other users.';
  END IF;

  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ra.scope_id,
    -- NULL scope_id (global grants, once E1.1 opens the door) surfaces
    -- as scope_type='global' so the SPA cache can differentiate at a
    -- glance without a second query.
    COALESCE(s.scope_type::text, 'global')                       AS scope_type,
    COALESCE(s.name,             '(all scopes)')                 AS scope_name,
    r.key                                                        AS role_key,
    COALESCE(
      ARRAY_AGG(DISTINCT p.key ORDER BY p.key) FILTER (WHERE p.key IS NOT NULL),
      ARRAY[]::TEXT[]
    )                                                            AS permission_keys
  FROM core.role_assignments ra
  INNER JOIN core.roles r             ON r.id = ra.role_id
  LEFT  JOIN core.scopes s            ON s.id = ra.scope_id
  LEFT  JOIN core.role_permissions rp ON rp.role_id = ra.role_id
  LEFT  JOIN core.permissions p       ON p.id       = rp.permission_id
  WHERE ra.user_id = p_user_id
    AND ra.revoked_at IS NULL
    AND ra.starts_at <= NOW()
    AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
  GROUP BY ra.scope_id, s.scope_type, s.name, r.key;
END;
$$;


--
-- Name: FUNCTION get_user_grants(p_user_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.get_user_grants(p_user_id uuid) IS 'Returns one row per (scope, role) direct grant the user holds, with the array of permission keys attached to that role. Used by the SPA session bridge (ADR-0035) to hydrate a client-side permission cache. NOT ancestor-walked — that logic lives in core.has_permission for per-check queries.';


--
-- Name: get_user_permissions(uuid, uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.get_user_permissions(p_user_id uuid, p_scope_id uuid) RETURNS TABLE(permission_key text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'get_user_permissions: cannot list another user''s permissions'
      USING ERRCODE = '42501',
            HINT = 'auth.uid() does not match p_user_id; only service_role may probe other users.';
  END IF;

  IF p_user_id IS NULL OR p_scope_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE scope_ancestry AS (
    SELECT s.id, s.parent_scope_id, s.chapter_kind
    FROM core.scopes s
    WHERE s.id = p_scope_id

    UNION ALL

    SELECT s.id, s.parent_scope_id, s.chapter_kind
    FROM core.scopes s
    INNER JOIN scope_ancestry a ON s.id = a.parent_scope_id
    WHERE a.chapter_kind IS DISTINCT FROM 'autonomous'
  )
  SELECT DISTINCT p.key
  FROM core.role_assignments ra
  INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
  INNER JOIN core.permissions p        ON p.id      = rp.permission_id
  LEFT  JOIN scope_ancestry sa         ON sa.id     = ra.scope_id
  WHERE ra.user_id = p_user_id
    AND ra.revoked_at IS NULL
    AND ra.starts_at <= NOW()
    AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
    AND (ra.scope_id IS NULL OR sa.id IS NOT NULL);
END;
$$;


--
-- Name: FUNCTION get_user_permissions(p_user_id uuid, p_scope_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.get_user_permissions(p_user_id uuid, p_scope_id uuid) IS 'Returns the distinct set of permission keys a user has at the scope (via roles granted there, in non-autonomous-chapter ancestors, or via global grants with scope_id=NULL).';


--
-- Name: grouping_tags_check_shape(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.grouping_tags_check_shape() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_scope_type   core.scope_type;
  v_chapter_kind core.chapter_kind;
  v_parent       UUID;
BEGIN
  SELECT scope_type, chapter_kind, parent_scope_id
    INTO v_scope_type, v_chapter_kind, v_parent
  FROM core.scopes
  WHERE id = NEW.grouping_chapter_scope_id;

  IF v_scope_type IS DISTINCT FROM 'chapter' THEN
    RAISE EXCEPTION 'grouping_chapter_scope_id must reference a chapter (got %)', v_scope_type
      USING ERRCODE = '23514';
  END IF;
  IF v_chapter_kind IS DISTINCT FROM 'grouping' THEN
    RAISE EXCEPTION 'grouping_chapter_scope_id must reference a grouping chapter (got kind %)', v_chapter_kind
      USING ERRCODE = '23514';
  END IF;
  IF v_parent IS DISTINCT FROM NEW.parent_branch_scope_id THEN
    RAISE EXCEPTION 'parent_branch_scope_id % does not match the chapter''s parent %', NEW.parent_branch_scope_id, v_parent
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: has_permission(uuid, uuid, text); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.has_permission(p_user_id uuid, p_scope_id uuid, p_permission_key text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid()
     AND COALESCE(auth.role(), '') NOT IN ('service_role', 'supabase_admin')
  THEN
    RAISE EXCEPTION 'has_permission: cannot check another user''s permissions'
      USING ERRCODE = '42501',
            HINT = 'auth.uid() does not match p_user_id; only service_role may probe other users.';
  END IF;

  IF p_user_id IS NULL OR p_scope_id IS NULL OR p_permission_key IS NULL THEN
    RETURN FALSE;
  END IF;

  WITH RECURSIVE scope_ancestry AS (
    -- The target scope itself is always in the ancestry, regardless of
    -- its own kind. Autonomy gates inheritance FROM the parent, not the
    -- scope's own grants.
    SELECT s.id, s.parent_scope_id, s.chapter_kind
    FROM core.scopes s
    WHERE s.id = p_scope_id

    UNION ALL

    -- Climb to the parent only when the CURRENT ancestor is NOT an
    -- autonomous chapter. chapter_kind is NULL for non-chapters and
    -- non-null for chapters; `IS DISTINCT FROM 'autonomous'` returns
    -- TRUE for both non-chapters and grouping chapters, matching the
    -- pre-migration `NOT is_autonomous` semantic exactly.
    SELECT s.id, s.parent_scope_id, s.chapter_kind
    FROM core.scopes s
    INNER JOIN scope_ancestry a ON s.id = a.parent_scope_id
    WHERE a.chapter_kind IS DISTINCT FROM 'autonomous'
  )
  SELECT EXISTS (
    SELECT 1
    FROM core.role_assignments ra
    INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
    INNER JOIN core.permissions p        ON p.id      = rp.permission_id
    LEFT  JOIN scope_ancestry sa         ON sa.id     = ra.scope_id
    WHERE ra.user_id = p_user_id
      AND p.key     = p_permission_key
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
      AND (ra.scope_id IS NULL OR sa.id IS NOT NULL)
  ) INTO v_result;

  RETURN COALESCE(v_result, FALSE);
END;
$$;


--
-- Name: FUNCTION has_permission(p_user_id uuid, p_scope_id uuid, p_permission_key text); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.has_permission(p_user_id uuid, p_scope_id uuid, p_permission_key text) IS 'Returns TRUE if the user has the named permission at the scope (or any non-autonomous-chapter ancestor, or via a global grant with scope_id=NULL). SECURITY DEFINER bypasses RLS on the RBAC tables. Self-introspection guarded.';


--
-- Name: has_permission_at_any_scope(uuid, text); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.has_permission_at_any_scope(p_user_id uuid, p_key text) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
BEGIN
  IF p_user_id IS NULL OR p_key IS NULL THEN RETURN FALSE; END IF;

  RETURN EXISTS (
    SELECT 1
    FROM core.role_assignments ra
    INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
    INNER JOIN core.permissions p        ON p.id     = rp.permission_id
    WHERE ra.user_id = p_user_id
      AND p.key      = p_key
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
  );
END;
$$;


--
-- Name: FUNCTION has_permission_at_any_scope(p_user_id uuid, p_key text); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.has_permission_at_any_scope(p_user_id uuid, p_key text) IS 'Cheap "does the user hold this permission at any scope?" gate for coarse checks (e.g. storage-bucket INSERT policies). NOT a substitute for per-scope has_permission — use at boundaries where the real scope check happens downstream.';


--
-- Name: is_admin_role_key(text); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.is_admin_role_key(role_key text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT role_key IN ('mainstream_admin', 'branch_admin');
$$;


--
-- Name: FUNCTION is_admin_role_key(role_key text); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.is_admin_role_key(role_key text) IS 'Returns TRUE if the role key is an admin per Phase 2 §6.1. Post 2026-07-05 batch-admin drop: {mainstream_admin, branch_admin} only.';


--
-- Name: mainstream_scope_id(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.mainstream_scope_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT id FROM core.scopes WHERE scope_type = 'mainstream' LIMIT 1;
$$;


--
-- Name: member_owned_by(uuid, uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.member_owned_by(p_member_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  IF p_member_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM core.member_accounts ma
    WHERE ma.member_id = p_member_id
      AND ma.auth_user_id = p_user_id
      AND ma.claim_status = 'claimed'
  ) INTO v_exists;
  RETURN COALESCE(v_exists, FALSE);
END;
$$;


--
-- Name: FUNCTION member_owned_by(p_member_id uuid, p_user_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.member_owned_by(p_member_id uuid, p_user_id uuid) IS 'RLS helper: does user own the member row via core.member_accounts? SECURITY DEFINER so the join to member_accounts doesn''t recurse into that table''s RLS.';


--
-- Name: members_cascade_deceased(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.members_cascade_deceased() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only fire when the status transitions INTO deceased.
  IF NEW.member_status = 'deceased' AND OLD.member_status IS DISTINCT FROM 'deceased' THEN
    UPDATE core.memberships
       SET membership_status = 'left',
           left_at           = COALESCE(left_at, NOW())
     WHERE member_id = NEW.id
       AND membership_status IN ('pending', 'active', 'passive');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION members_cascade_deceased(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.members_cascade_deceased() IS 'AFTER UPDATE trigger: on member_status → deceased, close every active/passive/pending membership to `left`. The audit trail is centrally captured because updates on core.memberships are RLS-gated and the Edge Function paths write audit; a raw superuser update from a script would bypass audit for the cascade, which is acceptable for the rare deceased flow.';


--
-- Name: members_check_scope_types(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.members_check_scope_types() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_type core.scope_type;
BEGIN
  SELECT scope_type INTO v_type FROM core.scopes WHERE id = NEW.batch_scope_id;
  IF v_type IS DISTINCT FROM 'batch' THEN
    RAISE EXCEPTION 'members.batch_scope_id must reference a batch scope (got %)', COALESCE(v_type::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  SELECT scope_type INTO v_type FROM core.scopes WHERE id = NEW.house_scope_id;
  IF v_type IS DISTINCT FROM 'house' THEN
    RAISE EXCEPTION 'members.house_scope_id must reference a house scope (got %)', COALESCE(v_type::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  SELECT scope_type INTO v_type FROM core.scopes WHERE id = NEW.network_scope_id;
  IF v_type IS DISTINCT FROM 'network' THEN
    RAISE EXCEPTION 'members.network_scope_id must reference a network scope (got %)', COALESCE(v_type::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION members_check_scope_types(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.members_check_scope_types() IS 'BEFORE trigger: enforces batch/house/network FK columns reference scopes of the correct scope_type. Postgres CHECK can''t run a subquery so this trigger is the canonical enforcement.';


--
-- Name: members_generate_member_code(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.members_generate_member_code() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_year_txt   TEXT;
  v_year_int   INTEGER;
  v_initials   TEXT;
  v_candidate  TEXT;
  v_attempt    INTEGER := 0;
BEGIN
  -- Preserve caller-supplied codes (imports, migrations, tests).
  IF NEW.member_code IS NOT NULL AND length(NEW.member_code) > 0 THEN
    RETURN NEW;
  END IF;

  -- Year prefix — from the member's batch scope. Every batch has an
  -- entry_year; the scope-type trigger already guarantees the FK is a
  -- batch. If the lookup somehow fails, fall back to XXXX rather than
  -- blocking the INSERT.
  SELECT entry_year INTO v_year_int
    FROM core.scopes WHERE id = NEW.batch_scope_id;
  v_year_txt := COALESCE(v_year_int::TEXT, 'XXXX');

  -- Initials — first letter of every whitespace-separated word in
  -- full_name, uppercased. "Sarah Wanki Njumbe" → "SWN".
  SELECT string_agg(upper(left(w, 1)), '' ORDER BY ord)
    INTO v_initials
    FROM (
      SELECT w, row_number() OVER () AS ord
        FROM regexp_split_to_table(COALESCE(NEW.full_name, ''), E'\\s+') AS w
       WHERE length(w) > 0
    ) t;
  IF v_initials IS NULL OR length(v_initials) = 0 THEN
    v_initials := 'X';
  END IF;

  -- Random 4 digits with collision retry. Bounded so a truly-exhausted
  -- (year, initials) namespace surfaces as an error rather than an
  -- infinite loop.
  LOOP
    v_attempt := v_attempt + 1;
    v_candidate := v_year_txt || '-' || v_initials || '-' ||
                   lpad(floor(random() * 10000)::INTEGER::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM core.members WHERE member_code = v_candidate
    );
    IF v_attempt > 50 THEN
      RAISE EXCEPTION 'members_generate_member_code: no unique code after 50 attempts for %-% (namespace exhausted)',
        v_year_txt, v_initials
        USING ERRCODE = '23505';
    END IF;
  END LOOP;

  NEW.member_code := v_candidate;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION members_generate_member_code(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.members_generate_member_code() IS 'BEFORE INSERT: generates members.member_code if not supplied. Format {batch_year}-{initials}-{4 digits}. Bounded retry (50) on collision.';


--
-- Name: membership_owned_by(uuid, uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.membership_owned_by(p_membership_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_hit BOOLEAN;
BEGIN
  IF p_membership_id IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;
  SELECT EXISTS (
    SELECT 1
    FROM core.memberships m
    INNER JOIN core.member_accounts ma ON ma.member_id = m.member_id
    WHERE m.id = p_membership_id
      AND ma.auth_user_id = p_user_id
      AND ma.claim_status = 'claimed'
  ) INTO v_hit;
  RETURN COALESCE(v_hit, FALSE);
END;
$$;


--
-- Name: memberships_check_passive_shape(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.memberships_check_passive_shape() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_scope_type core.scope_type;
BEGIN
  IF NEW.membership_status <> 'passive' THEN RETURN NEW; END IF;
  SELECT scope_type INTO v_scope_type FROM core.scopes WHERE id = NEW.scope_id;
  IF v_scope_type NOT IN ('branch', 'chapter') THEN
    RAISE EXCEPTION 'passive status is only valid on geographic memberships (got %)', v_scope_type
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: memberships_check_scope_shape(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.memberships_check_scope_shape() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_scope_type core.scope_type;
  v_chapter_kind core.chapter_kind;
BEGIN
  SELECT scope_type, chapter_kind
    INTO v_scope_type, v_chapter_kind
  FROM core.scopes
  WHERE id = NEW.scope_id;

  IF v_scope_type IS NULL THEN
    RAISE EXCEPTION 'memberships.scope_id % does not exist', NEW.scope_id
      USING ERRCODE = '23503';
  END IF;

  -- Geographic memberships only — branch or (autonomous) chapter.
  IF v_scope_type NOT IN ('branch', 'chapter') THEN
    RAISE EXCEPTION 'memberships.scope_id must reference a branch or chapter (got %)', v_scope_type
      USING ERRCODE = '23514';
  END IF;

  IF v_scope_type = 'chapter' AND v_chapter_kind IS DISTINCT FROM 'autonomous' THEN
    RAISE EXCEPTION 'memberships on a chapter require chapter_kind=autonomous (got %)', COALESCE(v_chapter_kind::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_source_of_transfer(uuid, uuid, uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.notify_source_of_transfer(p_source_scope_id uuid, p_membership_id uuid, p_actor_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'notifications', 'auth'
    AS $$
DECLARE
  v_count INTEGER := 0;
  v_source_admin_id UUID;
  v_member_id UUID;
BEGIN
  IF p_source_scope_id IS NULL OR p_membership_id IS NULL THEN
    RAISE EXCEPTION 'notify_source_of_transfer: source_scope_id + membership_id required'
      USING ERRCODE = '22004';
  END IF;

  SELECT member_id INTO v_member_id
  FROM core.memberships WHERE id = p_membership_id;

  -- Recipients: every user with an active membership.approve grant at
  -- the source scope. Includes NULL-scope global grants
  -- (mainstream_admin) because has_permission's ancestry walk short-
  -- circuits on scope_id IS NULL.
  FOR v_source_admin_id IN
    SELECT DISTINCT ra.user_id
    FROM core.role_assignments ra
    INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
    INNER JOIN core.permissions p        ON p.id     = rp.permission_id
    WHERE p.key = 'membership.approve'
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
      AND (ra.scope_id IS NULL OR ra.scope_id = p_source_scope_id)
      AND ra.user_id IS DISTINCT FROM p_actor_id   -- don't notify the acting admin
  LOOP
    INSERT INTO notifications.notification_events (
      event_type, severity, recipient_user_id, scope_id, payload
    ) VALUES (
      'membership.transfer.source_notified',
      'info',
      v_source_admin_id,
      p_source_scope_id,
      jsonb_build_object(
        'member_id',      v_member_id,
        'membership_id',  p_membership_id,
        'source_scope_id', p_source_scope_id,
        'actor_id',       p_actor_id,
        'channel',        'in_app'
      )
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


--
-- Name: FUNCTION notify_source_of_transfer(p_source_scope_id uuid, p_membership_id uuid, p_actor_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.notify_source_of_transfer(p_source_scope_id uuid, p_membership_id uuid, p_actor_id uuid) IS 'Fan-out in-app notification: enqueues one notification_events row per source-scope admin (has membership.approve) when a transfer completes. Called by approve-transfer Edge Function. In-app only — delivery rows are Epic 2.10.';


--
-- Name: perform_transfer(uuid, uuid, uuid, uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.perform_transfer(p_source_membership_id uuid, p_destination_scope_id uuid, p_approved_by uuid, p_transfer_request_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $_$
DECLARE
  v_member_id UUID;
  v_source_scope UUID;
  v_new_membership UUID;
BEGIN
  IF p_source_membership_id IS NULL OR p_destination_scope_id IS NULL OR p_approved_by IS NULL THEN
    RAISE EXCEPTION 'perform_transfer: all args required'
      USING ERRCODE = '22004';
  END IF;

  SELECT member_id, scope_id INTO v_member_id, v_source_scope
  FROM core.memberships WHERE id = p_source_membership_id;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'perform_transfer: source membership not found' USING ERRCODE = '02000';
  END IF;

  UPDATE core.memberships
     SET membership_status = 'transferred',
         transferred_at    = NOW()
   WHERE id = p_source_membership_id;

  INSERT INTO core.memberships (
    member_id, scope_id, membership_status, join_method,
    joined_at, approved_at, approved_by
  )
  VALUES (
    v_member_id, p_destination_scope_id, 'active', 'transfer',
    NOW(), NOW(), p_approved_by
  )
  RETURNING id INTO v_new_membership;

  IF p_transfer_request_id IS NOT NULL
     AND to_regclass('core.membership_transfers') IS NOT NULL THEN
    EXECUTE format(
      $sql$
        UPDATE core.membership_transfers
           SET status = 'approved',
               approved_at = NOW(),
               approved_by = %L
         WHERE id = %L
      $sql$,
      p_approved_by,
      p_transfer_request_id
    );
  END IF;

  RETURN v_new_membership;
END;
$_$;


--
-- Name: FUNCTION perform_transfer(p_source_membership_id uuid, p_destination_scope_id uuid, p_approved_by uuid, p_transfer_request_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.perform_transfer(p_source_membership_id uuid, p_destination_scope_id uuid, p_approved_by uuid, p_transfer_request_id uuid) IS 'Atomic transfer: closes source membership + opens destination as active + updates transfer request if provided. Callers must have cleared `membership.transfer` at the DESTINATION scope (2026-07-03 flip — was source pre-flip). The source registration_status row is preserved intact on the closed source membership (see the transferred_terminals_frozen trigger).';


--
-- Name: position_assignments_check_scope_type(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.position_assignments_check_scope_type() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_catalog_scope_type core.scope_type;
  v_scope_scope_type   core.scope_type;
BEGIN
  SELECT scope_type INTO v_catalog_scope_type
  FROM core.position_catalog WHERE id = NEW.position_catalog_id;

  SELECT scope_type INTO v_scope_scope_type
  FROM core.scopes WHERE id = NEW.scope_id;

  IF v_catalog_scope_type IS NULL THEN
    RAISE EXCEPTION 'position_catalog % not found', NEW.position_catalog_id
      USING ERRCODE = '23503';
  END IF;
  IF v_scope_scope_type IS NULL THEN
    RAISE EXCEPTION 'scope % not found', NEW.scope_id
      USING ERRCODE = '23503';
  END IF;
  IF v_catalog_scope_type IS DISTINCT FROM v_scope_scope_type THEN
    RAISE EXCEPTION 'position catalog scope_type % does not match scope scope_type %',
      v_catalog_scope_type, v_scope_scope_type
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: position_president_prompt(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.position_president_prompt() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'notifications', 'auth', 'public'
    AS $$
DECLARE
  v_position_name TEXT;
  v_has_admin     BOOLEAN;
BEGIN
  SELECT name INTO v_position_name
    FROM core.position_catalog WHERE id = NEW.position_catalog_id;

  IF v_position_name IS NULL OR v_position_name NOT ILIKE 'President%' THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
    INNER JOIN core.member_accounts ma ON ma.auth_user_id = ra.user_id
    WHERE ma.member_id = NEW.member_id
      AND ma.claim_status = 'claimed'
      AND r.key IN ('mainstream_admin', 'branch_admin')
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
      AND (ra.scope_id IS NULL OR ra.scope_id = NEW.scope_id)
  ) INTO v_has_admin;

  IF v_has_admin THEN
    RETURN NEW;
  END IF;

  -- Best-effort: the prompt is a nudge, not a hard requirement of the
  -- assignment. If the write fails (missing grant, schema drift, etc.)
  -- log a NOTICE and let the parent INSERT succeed.
  BEGIN
    INSERT INTO notifications.notification_events (
      event_type,
      severity,
      recipient_user_id,
      scope_id,
      payload
    ) VALUES (
      'position.president_needs_admin',
      'info',
      NEW.assigned_by,
      NEW.scope_id,
      jsonb_build_object(
        'member_id',              NEW.member_id,
        'position_assignment_id', NEW.id,
        'position_name',          v_position_name,
        'channel',                'in_app',
        'hint',                   'This president has no Admin role at this scope. Consider granting.'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'position_president_prompt: could not enqueue notification (%)', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION position_president_prompt(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.position_president_prompt() IS 'AFTER INSERT trigger on core.position_assignments — emits a best-effort in-app hint when a President is assigned to someone without an admin role at the scope. SECURITY DEFINER + EXCEPTION-wrapped INSERT so the trigger never breaks the parent assignment even if the caller lacks notifications-schema INSERT.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: registration_status; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.registration_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    membership_id uuid NOT NULL,
    fee_required boolean DEFAULT false NOT NULL,
    amount numeric(12,2),
    currency_code text DEFAULT 'XAF'::text,
    marked_paid_at timestamp with time zone,
    marked_paid_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    waived_at timestamp with time zone,
    waived_by uuid,
    waived_reason text,
    paid_on_behalf_at timestamp with time zone,
    paid_on_behalf_by uuid,
    paid_on_behalf_note text,
    CONSTRAINT registration_paid_and_waived_mutex CHECK ((NOT ((marked_paid_at IS NOT NULL) AND (waived_at IS NOT NULL)))),
    CONSTRAINT registration_terminals_consistent CHECK (((((marked_paid_at IS NULL) AND (marked_paid_by IS NULL)) OR ((marked_paid_at IS NOT NULL) AND (marked_paid_by IS NOT NULL))) AND (((waived_at IS NULL) AND (waived_by IS NULL)) OR ((waived_at IS NOT NULL) AND (waived_by IS NOT NULL))) AND (((paid_on_behalf_at IS NULL) AND (paid_on_behalf_by IS NULL)) OR ((paid_on_behalf_at IS NOT NULL) AND (paid_on_behalf_by IS NOT NULL))))),
    CONSTRAINT registration_terminals_mutually_exclusive CHECK ((((
CASE
    WHEN (marked_paid_at IS NOT NULL) THEN 1
    ELSE 0
END +
CASE
    WHEN (waived_at IS NOT NULL) THEN 1
    ELSE 0
END) +
CASE
    WHEN (paid_on_behalf_at IS NOT NULL) THEN 1
    ELSE 0
END) <= 1)),
    CONSTRAINT registration_terminals_only_if_required CHECK ((fee_required OR ((amount IS NULL) AND (marked_paid_at IS NULL) AND (waived_at IS NULL) AND (paid_on_behalf_at IS NULL)))),
    CONSTRAINT registration_waived_consistent CHECK ((((waived_at IS NULL) AND (waived_by IS NULL)) OR ((waived_at IS NOT NULL) AND (waived_by IS NOT NULL))))
);


--
-- Name: TABLE registration_status; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.registration_status IS 'Per-membership registration-fee tracking (§3.8). NON-GATING: membership stays active regardless — this is a searchable flag so Exco can find unregistered members (E1.7c filter).';


--
-- Name: COLUMN registration_status.waived_at; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.registration_status.waived_at IS 'Timestamp when an admin waived this registration fee. Paired with waived_by + waived_reason.';


--
-- Name: COLUMN registration_status.paid_on_behalf_at; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.registration_status.paid_on_behalf_at IS 'Timestamp when someone (paid_on_behalf_by) paid the registration on this member''s behalf. paid_on_behalf_note captures the payer''s context.';


--
-- Name: registration_state(core.registration_status); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.registration_state(t core.registration_status) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN NOT t.fee_required          THEN 'not_required'
    WHEN t.waived_at IS NOT NULL     THEN 'waived'
    WHEN t.marked_paid_at IS NOT NULL THEN 'paid'
    ELSE 'unpaid'
  END;
$$;


--
-- Name: FUNCTION registration_state(t core.registration_status); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.registration_state(t core.registration_status) IS 'Derived Phase 2 registration state (not_required | unpaid | paid | waived) from a core.registration_status row. Immutable — index-safe. Client mirror in packages/domain/src/registration/state.ts.';


--
-- Name: registration_state(boolean, timestamp with time zone, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.registration_state(p_fee_required boolean, p_marked_paid_at timestamp with time zone, p_waived_at timestamp with time zone, p_paid_on_behalf_at timestamp with time zone) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'pg_catalog'
    AS $$
  SELECT CASE
    WHEN NOT p_fee_required                THEN 'not_required'
    WHEN p_marked_paid_at    IS NOT NULL   THEN 'paid'
    WHEN p_waived_at         IS NOT NULL   THEN 'waived'
    WHEN p_paid_on_behalf_at IS NOT NULL   THEN 'paid_on_behalf'
    ELSE                                        'pending'
  END;
$$;


--
-- Name: FUNCTION registration_state(p_fee_required boolean, p_marked_paid_at timestamp with time zone, p_waived_at timestamp with time zone, p_paid_on_behalf_at timestamp with time zone); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.registration_state(p_fee_required boolean, p_marked_paid_at timestamp with time zone, p_waived_at timestamp with time zone, p_paid_on_behalf_at timestamp with time zone) IS 'Derives one of not_required | pending | paid | paid_on_behalf | waived from a registration_status row''s columns. IMMUTABLE for query planner + filter reuse.';


--
-- Name: registration_status_transferred_terminals_frozen_fn(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.registration_status_transferred_terminals_frozen_fn() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core'
    AS $$
DECLARE
  v_parent_status core.membership_status;
  v_had_terminal_before  BOOLEAN;
  v_has_terminal_after   BOOLEAN;
BEGIN
  SELECT membership_status INTO v_parent_status
  FROM core.memberships
  WHERE id = NEW.membership_id;

  -- Only guard rows attached to a transferred membership.
  IF v_parent_status IS DISTINCT FROM 'transferred' THEN
    RETURN NEW;
  END IF;

  v_had_terminal_before := OLD.marked_paid_at IS NOT NULL
                        OR OLD.waived_at IS NOT NULL
                        OR OLD.paid_on_behalf_at IS NOT NULL;

  v_has_terminal_after  := NEW.marked_paid_at IS NOT NULL
                        OR NEW.waived_at IS NOT NULL
                        OR NEW.paid_on_behalf_at IS NOT NULL;

  -- Guard fires only when the row had a terminal state and no longer
  -- does. Correcting one terminal to a different terminal (both
  -- non-null on the row after UPDATE) stays legal.
  IF v_had_terminal_before AND NOT v_has_terminal_after THEN
    RAISE EXCEPTION
      'registration_status: cannot null all terminal timestamps on a row attached to a transferred membership (would erase historical dues state)'
      USING ERRCODE = '23514',
            HINT    = 'Set a different terminal (marked_paid_at, waived_at, or paid_on_behalf_at) in the same UPDATE if the entry was mis-keyed.';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION registration_status_transferred_terminals_frozen_fn(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.registration_status_transferred_terminals_frozen_fn() IS 'Guards against nulling ALL terminal states on a registration_status row whose parent membership is transferred. Fires only for that exact (parent=transferred, all-terminals-null-after) shape — legitimate corrections between terminals still work.';


--
-- Name: role_assignments_audit_trigger(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.role_assignments_audit_trigger() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'audit', 'auth'
    AS $$
DECLARE
  v_action          TEXT;
  v_actor           UUID;
  v_audit_entry_id  UUID;
  v_prior_snapshot  JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'granted';
    v_actor  := NEW.granted_by;
    v_prior_snapshot := NULL;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
      v_action := 'revoked';
      v_actor  := NEW.revoked_by;
    ELSIF OLD IS DISTINCT FROM NEW THEN
      v_action := 'modified';
      v_actor  := NEW.granted_by;  -- best-effort; modifications are rare
    ELSE
      -- No meaningful change (UPDATE that touched nothing). Skip the audit
      -- entry rather than spam the log with no-ops.
      RETURN NEW;
    END IF;
    v_prior_snapshot := to_jsonb(OLD);
  ELSE
    RETURN NEW; -- shouldn't reach (trigger only on INSERT/UPDATE)
  END IF;

  -- Write the central audit entry. Action key matches @shesa/types
  -- AuditAction literal: 'role.granted' / 'role.revoked' (no
  -- '.modified' in the type yet; if we start writing modifications
  -- meaningfully we'll add it. For now those use 'role.granted' since
  -- a modification is conceptually a re-grant.)
  v_audit_entry_id := audit.log_event(
    p_action        := CASE v_action
                         WHEN 'granted' THEN 'role.granted'
                         WHEN 'revoked' THEN 'role.revoked'
                         ELSE 'role.granted'
                       END,
    p_entity_schema := 'core',
    p_entity_table  := 'role_assignments',
    p_entity_id     := NEW.id,
    p_scope_id      := NEW.scope_id,
    p_metadata      := jsonb_build_object(
                         'role_id', NEW.role_id,
                         'user_id', NEW.user_id,
                         'history_action', v_action
                       )
  );

  -- Write the per-entity history row.
  INSERT INTO core.role_history (
    role_assignment_id, action, changed_by, prior_snapshot, audit_entry_id
  )
  VALUES (
    NEW.id, v_action, v_actor, v_prior_snapshot, v_audit_entry_id
  );

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION role_assignments_audit_trigger(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.role_assignments_audit_trigger() IS 'AFTER INSERT/UPDATE trigger on core.role_assignments. Writes to audit.audit_entries (central log) AND core.role_history (per-entity timeline) so callers cannot create or modify a role assignment without producing an audit trail.';


--
-- Name: role_history_block_mutation(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.role_history_block_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'core.role_history is append-only (% blocked)', TG_OP
    USING ERRCODE = '42501',
          HINT = 'Role history is the audit trail for role assignments; entries cannot be modified or deleted.';
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION set_updated_at(); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.set_updated_at() IS 'BEFORE UPDATE trigger that stamps updated_at = NOW(). Attached to every core.* table with an updated_at column.';


--
-- Name: update_batch(uuid, text, integer, text, text, text, text, core.scope_status); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.update_batch(p_scope_id uuid, p_name text, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_status core.scope_status) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public', 'auth'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.scopes
    WHERE id = p_scope_id AND scope_type = 'batch'
  ) THEN
    RAISE EXCEPTION 'batch % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  UPDATE core.scopes
     SET name   = COALESCE(p_name,   name),
         status = COALESCE(p_status, status)
   WHERE id = p_scope_id;

  UPDATE core.batches
     SET ordinal       = COALESCE(p_ordinal,       ordinal),
         nickname      = COALESCE(p_nickname,      nickname),
         description   = COALESCE(p_description,   description),
         contact_email = COALESCE(p_contact_email, contact_email),
         contact_phone = COALESCE(p_contact_phone, contact_phone)
   WHERE scope_id = p_scope_id;
END;
$$;


--
-- Name: FUNCTION update_batch(p_scope_id uuid, p_name text, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_status core.scope_status); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.update_batch(p_scope_id uuid, p_name text, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_status core.scope_status) IS 'Atomic scopes + batches patch. SECURITY DEFINER — Edge Function must clear scope.update at the batch first.';


--
-- Name: update_branch(uuid, text, text, text, text, text, text, text, boolean, numeric, text, text, text, core.scope_status); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.update_branch(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public', 'auth'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.scopes
    WHERE id = p_scope_id AND scope_type = 'branch'
  ) THEN
    RAISE EXCEPTION 'branch % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  UPDATE core.scopes
     SET name          = COALESCE(p_name,          name),
         currency_code = COALESCE(UPPER(p_currency_code), currency_code),
         status        = COALESCE(p_status,        status)
   WHERE id = p_scope_id;

  UPDATE core.branches
     SET country_code              = COALESCE(UPPER(p_country_code),               country_code),
         region                    = COALESCE(p_region,                             region),
         city                      = COALESCE(p_city,                               city),
         nickname                  = COALESCE(p_nickname,                           nickname),
         description               = COALESCE(p_description,                        description),
         registration_fee_required = COALESCE(p_registration_fee_required,          registration_fee_required),
         registration_fee_amount   = COALESCE(p_registration_fee_amount,            registration_fee_amount),
         registration_fee_currency = COALESCE(NULLIF(UPPER(COALESCE(p_registration_fee_currency, '')), ''),
                                              registration_fee_currency),
         contact_email             = COALESCE(p_contact_email,                      contact_email),
         contact_phone             = COALESCE(p_contact_phone,                      contact_phone)
   WHERE scope_id = p_scope_id;
END;
$$;


--
-- Name: FUNCTION update_branch(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.update_branch(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) IS 'Atomic scopes + branches patch. SECURITY DEFINER — the caller must have already cleared scope.update at the branch via the Edge Function.';


--
-- Name: update_chapter(uuid, text, text, text, text, text, text, text, boolean, numeric, text, text, text, core.scope_status); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.update_chapter(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public', 'auth'
    AS $$
DECLARE
  v_kind core.chapter_kind;
BEGIN
  SELECT chapter_kind INTO v_kind
  FROM core.scopes
  WHERE id = p_scope_id AND scope_type = 'chapter';

  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'chapter % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  UPDATE core.scopes
     SET name          = COALESCE(p_name,          name),
         currency_code = CASE WHEN v_kind = 'autonomous'
                              THEN COALESCE(UPPER(p_currency_code), currency_code)
                              ELSE currency_code
                         END,
         status        = COALESCE(p_status,        status)
   WHERE id = p_scope_id;

  UPDATE core.chapters
     SET country_code = COALESCE(UPPER(p_country_code), country_code),
         region       = COALESCE(p_region,               region),
         city         = COALESCE(p_city,                 city),
         nickname     = COALESCE(p_nickname,             nickname),
         description  = COALESCE(p_description,          description),
         registration_fee_required = CASE WHEN v_kind = 'autonomous'
                                          THEN COALESCE(p_registration_fee_required, registration_fee_required)
                                          ELSE FALSE
                                     END,
         registration_fee_amount   = CASE WHEN v_kind = 'autonomous'
                                          THEN COALESCE(p_registration_fee_amount, registration_fee_amount)
                                          ELSE NULL
                                     END,
         registration_fee_currency = CASE WHEN v_kind = 'autonomous'
                                          THEN COALESCE(
                                                 NULLIF(UPPER(COALESCE(p_registration_fee_currency, '')), ''),
                                                 registration_fee_currency)
                                          ELSE NULL
                                     END,
         contact_email = CASE WHEN v_kind = 'autonomous'
                              THEN COALESCE(p_contact_email, contact_email)
                              ELSE NULL
                         END,
         contact_phone = CASE WHEN v_kind = 'autonomous'
                              THEN COALESCE(p_contact_phone, contact_phone)
                              ELSE NULL
                         END
   WHERE scope_id = p_scope_id;
END;
$$;


--
-- Name: FUNCTION update_chapter(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.update_chapter(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) IS 'Atomic scopes + chapters patch. Grouping chapters ignore finance/contact fields. chapter_kind changes go through core.change_chapter_autonomy for the demote guard.';


--
-- Name: update_network(uuid, text, text, text, text, text, integer, core.scope_status); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.update_network(p_scope_id uuid, p_name text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_status core.scope_status) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public', 'auth'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.scopes
    WHERE id = p_scope_id AND scope_type = 'network'
  ) THEN
    RAISE EXCEPTION 'network % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  UPDATE core.scopes
     SET name   = COALESCE(p_name,   name),
         status = COALESCE(p_status, status)
   WHERE id = p_scope_id;

  UPDATE core.networks
     SET short_name  = COALESCE(p_short_name,  short_name),
         description = COALESCE(p_description, description),
         icon        = COALESCE(p_icon,        icon),
         color_hex   = COALESCE(p_color_hex,   color_hex),
         sort_order  = COALESCE(p_sort_order,  sort_order)
   WHERE scope_id = p_scope_id;
END;
$$;


--
-- Name: FUNCTION update_network(p_scope_id uuid, p_name text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_status core.scope_status); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.update_network(p_scope_id uuid, p_name text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_status core.scope_status) IS 'Atomic scopes + networks patch. SECURITY DEFINER — the caller must have already cleared scope.update at the network via the Edge Function''s authorize() check.';


--
-- Name: would_be_last_admin(uuid); Type: FUNCTION; Schema: core; Owner: -
--

CREATE FUNCTION core.would_be_last_admin(p_role_assignment_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  v_scope_id     UUID;
  v_role_key     TEXT;
  v_active_other INTEGER;
BEGIN
  IF p_role_assignment_id IS NULL THEN RETURN FALSE; END IF;

  SELECT ra.scope_id, r.key INTO v_scope_id, v_role_key
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
   WHERE ra.id = p_role_assignment_id;

  -- No row, or not an admin role, or global scope — never a
  -- last-admin risk.
  IF v_scope_id IS NULL OR NOT core.is_admin_role_key(v_role_key) THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*)
    INTO v_active_other
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
   WHERE ra.scope_id = v_scope_id
     AND ra.id <> p_role_assignment_id
     AND core.is_admin_role_key(r.key)
     AND ra.revoked_at IS NULL
     AND ra.starts_at <= NOW()
     AND (ra.ends_at IS NULL OR ra.ends_at > NOW());

  RETURN v_active_other = 0;
END;
$$;


--
-- Name: FUNCTION would_be_last_admin(p_role_assignment_id uuid); Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON FUNCTION core.would_be_last_admin(p_role_assignment_id uuid) IS 'Read-only pre-flight for the Exco UI Revoke button. Returns TRUE if revoking the named assignment would leave the scope with zero active admin holders. Does NOT enforce; the BEFORE trigger does.';


--
-- Name: count_audience(jsonb); Type: FUNCTION; Schema: exco; Owner: -
--

CREATE FUNCTION exco.count_audience(def jsonb) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  SELECT COUNT(*)::int FROM exco.resolve_audience(def);
$$;


--
-- Name: FUNCTION count_audience(def jsonb); Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON FUNCTION exco.count_audience(def jsonb) IS 'Thin COUNT(*) wrapper on exco.resolve_audience. Backs the "reaches ~N members" live preview on the AudienceSelector UI. Cheap enough to run on every filter change.';


--
-- Name: events_block_archive_with_paid_contribution(); Type: FUNCTION; Schema: exco; Owner: -
--

CREATE FUNCTION exco.events_block_archive_with_paid_contribution() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_charge_id UUID;
  v_charge_name TEXT;
BEGIN
  -- Only guard the archive transition; every other UPDATE passes through.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'archived' THEN
    RETURN NEW;
  END IF;

  -- Look for a live contribution with at least one non-reversed payment.
  -- "Live" here means lifecycle IN ('open', 'closed') — a draft or an
  -- already-archived contribution doesn't block the event.
  --
  -- "Non-reversed" is computed via the reverses_payment_id chain: a
  -- payment IS reversed if another payment row's reverses_payment_id
  -- points at it AND that reversing payment hasn't itself been reversed.
  -- For M3 v1 we approximate with "at least one payment exists that is
  -- not itself a reversal AND is not itself reversed by a downstream row."
  -- Exact chain semantics land with the payment engine (M4); this is
  -- the safe over-approximation.

  SELECT c.id, c.name
    INTO v_charge_id, v_charge_name
  FROM finance.charges c
  WHERE c.event_id = NEW.id
    AND c.lifecycle IN ('open', 'closed')
    AND EXISTS (
      SELECT 1
        FROM finance.payments p
       WHERE p.charge_id = c.id
         AND p.reverses_payment_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM finance.payments r
            WHERE r.reverses_payment_id = p.id
         )
    )
  LIMIT 1;

  IF v_charge_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot archive event %: contribution "%" (%) has recorded payments. Archive the contribution first.',
      NEW.id, v_charge_name, v_charge_id
      USING ERRCODE = '23514',
            HINT = 'Settle or archive the referenced contribution before archiving the event.';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION events_block_archive_with_paid_contribution(); Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON FUNCTION exco.events_block_archive_with_paid_contribution() IS 'Blocks archiving an event that has a live (open/closed) contribution carrying at least one non-reversed payment. Spec Part IV: event-tie invariant. Fires only on the archive transition.';


--
-- Name: resolve_audience(jsonb); Type: FUNCTION; Schema: exco; Owner: -
--

CREATE FUNCTION exco.resolve_audience(def jsonb) RETURNS TABLE(member_id uuid)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_membership_mode  text;
  v_membership_ids   uuid[];

  v_location_mode    text;
  v_location_countries text[];
  v_location_regions text[];
  v_location_cities  text[];

  v_houses_mode      text;
  v_houses_ids       uuid[];

  v_networks_mode    text;
  v_networks_ids     uuid[];

  v_batches_mode     text;
  v_batches_ids      uuid[];
BEGIN
  -- --- Extract + normalize the five group filters --------------------------

  v_membership_mode := COALESCE(def->'membership'->>'mode', 'all');
  v_membership_ids  := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'membership'->'scopeIds')::uuid),
    ARRAY[]::uuid[]
  );

  v_location_mode      := COALESCE(def->'location'->>'mode', 'all');
  v_location_countries := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'location'->'countries')),
    ARRAY[]::text[]
  );
  v_location_regions   := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'location'->'regions')),
    ARRAY[]::text[]
  );
  v_location_cities    := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'location'->'cities')),
    ARRAY[]::text[]
  );

  v_houses_mode := COALESCE(def->'houses'->>'mode', 'all');
  v_houses_ids  := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'houses'->'scopeIds')::uuid),
    ARRAY[]::uuid[]
  );

  v_networks_mode := COALESCE(def->'networks'->>'mode', 'all');
  v_networks_ids  := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'networks'->'scopeIds')::uuid),
    ARRAY[]::uuid[]
  );

  v_batches_mode := COALESCE(def->'batches'->>'mode', 'all');
  v_batches_ids  := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'batches'->'scopeIds')::uuid),
    ARRAY[]::uuid[]
  );

  -- --- Mode-value sanity --------------------------------------------------

  IF v_membership_mode NOT IN ('all', 'specific')
     OR v_location_mode NOT IN ('all', 'specific')
     OR v_houses_mode NOT IN ('all', 'specific')
     OR v_networks_mode NOT IN ('all', 'specific')
     OR v_batches_mode NOT IN ('all', 'specific')
  THEN
    RAISE EXCEPTION 'exco.resolve_audience: mode must be "all" or "specific" for every group'
      USING ERRCODE = '22023';
  END IF;

  -- --- The query ----------------------------------------------------------
  --
  -- One pass across core.members. Each of the five groups contributes
  -- an AND-connected predicate; specific-mode groups activate a
  -- narrower condition, all-mode groups short-circuit to TRUE.
  --
  RETURN QUERY
  SELECT DISTINCT m.id
  FROM core.members m
  WHERE
    -- Baseline: member must have at least one active membership.
    -- Excludes 'left' / 'transferred' / 'pending' etc. — the deceased
    -- cascade closes memberships too. A member who has fully exited
    -- the org appears in no audience. If a future re-engagement
    -- feature needs 'passive' or 'left' members, add a status-filter
    -- parameter then; don't loosen this default.
    EXISTS (
      SELECT 1
      FROM core.memberships mb
      WHERE mb.member_id = m.id
        AND mb.membership_status = 'active'
    )

    -- Membership: does the member have an ACTIVE membership at any
    -- of the selected scope_ids?
    AND (
      v_membership_mode = 'all'
      OR EXISTS (
        SELECT 1
        FROM core.memberships ms
        WHERE ms.member_id = m.id
          AND ms.membership_status = 'active'
          AND ms.scope_id = ANY (v_membership_ids)
      )
    )

    -- Location: does the member's CURRENT RESIDENCE match country
    -- OR region OR city? OR-within-group per the spec. Uses the
    -- member-level current_* fields — a Buea branch member living
    -- in Yaoundé matches "members in Yaoundé". A member with no
    -- current-location fields matches nothing.
    AND (
      v_location_mode = 'all'
      OR (
        (cardinality(v_location_countries) > 0
          AND m.current_country = ANY (v_location_countries))
        OR (cardinality(v_location_regions) > 0
          AND m.current_region_state = ANY (v_location_regions))
        OR (cardinality(v_location_cities) > 0
          AND m.current_city = ANY (v_location_cities))
      )
    )

    -- Houses: attribute-based on the member row.
    AND (
      v_houses_mode = 'all'
      OR m.house_scope_id = ANY (v_houses_ids)
    )

    -- Networks: attribute-based.
    AND (
      v_networks_mode = 'all'
      OR m.network_scope_id = ANY (v_networks_ids)
    )

    -- Batches: attribute-based.
    AND (
      v_batches_mode = 'all'
      OR m.batch_scope_id = ANY (v_batches_ids)
    );
END;
$$;


--
-- Name: FUNCTION resolve_audience(def jsonb); Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON FUNCTION exco.resolve_audience(def jsonb) IS 'Given a shared-audience JSONB definition, returns the set of member IDs matching. Five-group AND-across / OR-within semantics. Used by announcements + events (Phase 2) and later contribution targeting. See docs/product/entities.md#shared-audience--publishing-engine.';


--
-- Name: can_read_reports(uuid); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.can_read_reports(p_scope_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'public'
    AS $$
BEGIN
  RETURN core.has_permission(auth.uid(), p_scope_id, 'finance.report')
      OR core.has_permission(auth.uid(), p_scope_id, 'treasury.read')
      OR core.has_permission(auth.uid(), p_scope_id, 'finance.read');
END;
$$;


--
-- Name: charge_targets_enforce_shape(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.charge_targets_enforce_shape() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_charge finance.charges%ROWTYPE;
BEGIN
  SELECT * INTO v_charge FROM finance.charges WHERE id = NEW.charge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'charge not found: %', NEW.charge_id USING ERRCODE = 'P0002';
  END IF;
  IF v_charge.target_party_type IS DISTINCT FROM 'branch' THEN
    RAISE EXCEPTION 'charge_targets only apply to branch-targeted charges (charge %)', NEW.charge_id
      USING ERRCODE = '22023';
  END IF;
  IF NEW.currency <> v_charge.currency THEN
    RAISE EXCEPTION 'charge_targets.currency (%) must match parent charge (%)', NEW.currency, v_charge.currency
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: compute_period(finance.charge_recurrence, integer, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.compute_period(p_recurrence finance.charge_recurrence, p_interval integer, p_reference timestamp with time zone) RETURNS TABLE(period_start date, period_end date)
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_year        INT := EXTRACT(YEAR FROM p_reference)::int;
  v_month_1b    INT := EXTRACT(MONTH FROM p_reference)::int;   -- 1-12
  v_month_0b    INT := v_month_1b - 1;                          -- 0-11
  v_quarter     INT;
  v_half        INT;
  v_anchored    INT;
BEGIN
  IF p_interval < 1 THEN
    RAISE EXCEPTION 'compute_period: interval must be >= 1 (got %)', p_interval
      USING ERRCODE = '22023';
  END IF;

  IF p_recurrence = 'one_time' THEN
    RAISE EXCEPTION 'compute_period: one_time has no recurring period'
      USING ERRCODE = '22023';
  END IF;

  CASE p_recurrence
    WHEN 'monthly' THEN
      v_anchored := (v_month_0b / p_interval) * p_interval;    -- 0-based
      period_start := make_date(v_year, v_anchored + 1, 1);
      period_end   := (period_start + (p_interval || ' months')::interval)::date;

    WHEN 'quarterly' THEN
      v_quarter := v_month_0b / 3;                              -- 0..3
      v_anchored := (v_quarter / p_interval) * p_interval;
      period_start := make_date(v_year, v_anchored * 3 + 1, 1);
      period_end   := (period_start + (p_interval * 3 || ' months')::interval)::date;

    WHEN 'biannual' THEN
      v_half := CASE WHEN v_month_0b < 6 THEN 0 ELSE 1 END;
      v_anchored := (v_half / p_interval) * p_interval;
      period_start := make_date(v_year, v_anchored * 6 + 1, 1);
      period_end   := (period_start + (p_interval * 6 || ' months')::interval)::date;

    WHEN 'yearly' THEN
      v_anchored := (v_year / p_interval) * p_interval;
      period_start := make_date(v_anchored, 1, 1);
      period_end   := (period_start + (p_interval || ' years')::interval)::date;

    ELSE
      RAISE EXCEPTION 'compute_period: unknown recurrence %', p_recurrence;
  END CASE;

  RETURN NEXT;
END;
$$;


--
-- Name: FUNCTION compute_period(p_recurrence finance.charge_recurrence, p_interval integer, p_reference timestamp with time zone); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.compute_period(p_recurrence finance.charge_recurrence, p_interval integer, p_reference timestamp with time zone) IS 'Pure period-boundary math for a recurring charge. Returns (start, end) as DATEs; end is exclusive. Mirrors packages/domain/src/finance/periods.ts.';


--
-- Name: effective_amount(uuid, uuid, date); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.effective_amount(p_charge_id uuid, p_target_scope_id uuid, p_period_start date) RETURNS numeric
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'finance', 'public'
    AS $$
  SELECT v.amount
    FROM finance.charge_amount_versions v
   WHERE v.charge_id = p_charge_id
     AND v.target_scope_id IS NOT DISTINCT FROM p_target_scope_id
     AND v.effective_from <= p_period_start
   ORDER BY v.effective_from DESC
   LIMIT 1;
$$;


--
-- Name: FUNCTION effective_amount(p_charge_id uuid, p_target_scope_id uuid, p_period_start date); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.effective_amount(p_charge_id uuid, p_target_scope_id uuid, p_period_start date) IS 'The scheduled amount in force for (charge, target) at a period start, or NULL if no version applies. target NULL = base/member amount.';


--
-- Name: expenses_block_delete(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.expenses_block_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'finance.expenses rows are not deletable'
    USING ERRCODE = '42501',
          HINT = 'Insert a reversing expense with reverses_expense_id + a reason.';
END;
$$;


--
-- Name: expenses_enforce_freeze(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.expenses_enforce_freeze() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.amount              IS DISTINCT FROM OLD.amount              THEN RAISE EXCEPTION 'finance.expenses.amount is frozen'              USING ERRCODE = '42501'; END IF;
  IF NEW.currency            IS DISTINCT FROM OLD.currency            THEN RAISE EXCEPTION 'finance.expenses.currency is frozen'            USING ERRCODE = '42501'; END IF;
  IF NEW.category_id         IS DISTINCT FROM OLD.category_id         THEN RAISE EXCEPTION 'finance.expenses.category_id is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.payee               IS DISTINCT FROM OLD.payee               THEN RAISE EXCEPTION 'finance.expenses.payee is frozen'               USING ERRCODE = '42501'; END IF;
  IF NEW.description         IS DISTINCT FROM OLD.description         THEN RAISE EXCEPTION 'finance.expenses.description is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.attachment_url      IS DISTINCT FROM OLD.attachment_url      THEN RAISE EXCEPTION 'finance.expenses.attachment_url is frozen'      USING ERRCODE = '42501'; END IF;
  IF NEW.incurred_at         IS DISTINCT FROM OLD.incurred_at         THEN RAISE EXCEPTION 'finance.expenses.incurred_at is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.scope_id            IS DISTINCT FROM OLD.scope_id            THEN RAISE EXCEPTION 'finance.expenses.scope_id is frozen'            USING ERRCODE = '42501'; END IF;
  IF NEW.reverses_expense_id IS DISTINCT FROM OLD.reverses_expense_id THEN RAISE EXCEPTION 'finance.expenses.reverses_expense_id is frozen' USING ERRCODE = '42501'; END IF;
  IF NEW.reversal_reason     IS DISTINCT FROM OLD.reversal_reason     THEN RAISE EXCEPTION 'finance.expenses.reversal_reason is frozen'     USING ERRCODE = '42501'; END IF;

  -- Once approved, further UPDATEs are entirely disallowed.
  IF OLD.status = 'approved' THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
      RAISE EXCEPTION 'finance.expenses row is frozen once status=approved'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: expenses_write_ledger_on_approve(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.expenses_write_ledger_on_approve() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status = 'pending_approval' AND NEW.status = 'approved' THEN
    PERFORM finance.write_ledger_from_expense(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: expenses_write_ledger_on_insert(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.expenses_write_ledger_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status IN ('recorded', 'approved') THEN
    PERFORM finance.write_ledger_from_expense(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: generate_obligations_for_charge(uuid, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.generate_obligations_for_charge(p_charge_id uuid, p_reference timestamp with time zone DEFAULT now()) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_charge          finance.charges%ROWTYPE;
  v_period_start    DATE;
  v_period_end      DATE;
  v_inserted        INTEGER := 0;

  v_member_id       UUID;
  v_joined_at       TIMESTAMPTZ;
  v_period_base     NUMERIC(20, 4);
  v_effective_base  NUMERIC(20, 4);
  v_amount          NUMERIC(20, 4);
  v_days_in_period  INTEGER;
  v_days_owed       INTEGER;
  v_ex_id           UUID;
  v_ex_amount       NUMERIC(20, 4);
  v_ex_form         TEXT;
  v_ex_priority     INTEGER;

  v_target_scope_id UUID;
  v_ct_amount       NUMERIC(20, 4);
  v_target_amount   NUMERIC(20, 4);
BEGIN
  SELECT * INTO v_charge FROM finance.charges WHERE id = p_charge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'charge not found: %', p_charge_id USING ERRCODE = 'P0002';
  END IF;

  IF v_charge.status <> 'active' THEN
    RETURN 0;
  END IF;

  IF v_charge.shape NOT IN ('charge', 'fixed') THEN
    RETURN 0;
  END IF;

  IF v_charge.activation_date IS NOT NULL AND v_charge.activation_date > p_reference THEN
    RETURN 0;
  END IF;

  IF v_charge.shape = 'fixed' OR v_charge.recurrence = 'one_time' THEN
    v_period_start := COALESCE(
      v_charge.activation_date::date,
      v_charge.open_date::date,
      p_reference::date
    );
    v_period_end := v_period_start + INTERVAL '1 day';
  ELSE
    SELECT p.period_start, p.period_end
      INTO v_period_start, v_period_end
      FROM finance.compute_period(v_charge.recurrence, v_charge.recurrence_interval, p_reference) p;
  END IF;

  -- ── Branch-targeted: one obligation per charge_targets row ────────
  IF v_charge.target_party_type = 'branch' THEN
    FOR v_target_scope_id, v_ct_amount IN
      SELECT ct.target_scope_id, ct.amount
        FROM finance.charge_targets ct
       WHERE ct.charge_id = v_charge.id
    LOOP
      v_target_amount := COALESCE(
        finance.effective_amount(v_charge.id, v_target_scope_id, v_period_start),
        v_ct_amount
      );
      BEGIN
        INSERT INTO finance.obligations
          (charge_id, scope_id, party_type, party_id, amount, currency, status,
           exception_applied, prorated, period_start, period_end)
        VALUES
          (v_charge.id, v_charge.scope_id, 'branch', v_target_scope_id, v_target_amount,
           v_charge.currency, 'open',
           NULL, FALSE, v_period_start, v_period_end);
        v_inserted := v_inserted + 1;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END LOOP;
    RETURN v_inserted;
  END IF;

  -- ── Member-targeted ──────────────────────────────────────────────
  v_days_in_period := (v_period_end - v_period_start);
  IF v_days_in_period <= 0 THEN
    v_days_in_period := 1;
  END IF;

  -- Base amount in force for THIS period (scheduled change or founding).
  v_period_base := COALESCE(
    finance.effective_amount(v_charge.id, NULL, v_period_start),
    v_charge.base_amount,
    0
  );

  FOR v_member_id, v_joined_at IN
    SELECT m.member_id, m.joined_at
      FROM core.memberships m
     WHERE m.scope_id = v_charge.scope_id
       AND m.membership_status IN ('active', 'passive')
  LOOP
    IF v_joined_at >= v_period_end THEN
      CONTINUE;
    END IF;

    v_ex_id := NULL;
    v_ex_amount := NULL;
    v_ex_form := NULL;
    v_ex_priority := NULL;

    SELECT r.exception_id, r.replacement_amount, r.matched_form, r.matched_priority
      INTO v_ex_id, v_ex_amount, v_ex_form, v_ex_priority
      FROM finance.resolve_exception_for_charge(p_charge_id, v_member_id, p_reference) r;

    IF v_ex_amount IS NOT NULL THEN
      v_effective_base := v_ex_amount;
    ELSE
      v_effective_base := v_period_base;
    END IF;

    IF v_joined_at <= v_period_start OR v_effective_base = 0 THEN
      v_amount := v_effective_base;
    ELSE
      v_days_owed := (v_period_end - v_joined_at::date);
      IF v_days_owed >= v_days_in_period THEN
        v_amount := v_effective_base;
      ELSIF v_days_owed <= 0 THEN
        CONTINUE;
      ELSE
        v_amount := ROUND(v_effective_base * v_days_owed::numeric / v_days_in_period::numeric, 2);
      END IF;
    END IF;

    BEGIN
      INSERT INTO finance.obligations
        (charge_id, scope_id, party_type, party_id, amount, currency, status,
         exception_applied, prorated, period_start, period_end)
      VALUES
        (v_charge.id, v_charge.scope_id, 'member', v_member_id, v_amount,
         v_charge.currency, 'open',
         v_ex_id,
         (v_amount < v_effective_base),
         v_period_start, v_period_end);
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN v_inserted;
END;
$$;


--
-- Name: FUNCTION generate_obligations_for_charge(p_charge_id uuid, p_reference timestamp with time zone); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.generate_obligations_for_charge(p_charge_id uuid, p_reference timestamp with time zone) IS 'Materialises obligations for the current period. Reads effective amounts (finance.effective_amount) so scheduled forward-dated changes apply from their period; founding base_amount / charge_targets.amount are the fallback. Individual: one row per active/passive member (exception + day-proration). Group: one row per charge_targets entry. Idempotent via UNIQUE(charge_id, party_type, party_id, period_start).';


--
-- Name: generate_obligations_sweep(timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.generate_obligations_sweep(p_reference timestamp with time zone DEFAULT now()) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_total INTEGER := 0;
  v_charge_id UUID;
  v_inserted INTEGER;
BEGIN
  FOR v_charge_id IN
    SELECT id FROM finance.charges
     WHERE status = 'active'
       AND shape IN ('charge', 'fixed')
       AND (activation_date IS NULL OR activation_date <= p_reference)
  LOOP
    v_inserted := finance.generate_obligations_for_charge(v_charge_id, p_reference);
    v_total := v_total + v_inserted;
  END LOOP;

  RETURN v_total;
END;
$$;


--
-- Name: FUNCTION generate_obligations_sweep(p_reference timestamp with time zone); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.generate_obligations_sweep(p_reference timestamp with time zone) IS 'Fires generate_obligations_for_charge over every active recurring charge. Scheduled hourly via pg_cron (see the pg_cron schedule migration). Returns total obligations inserted.';


--
-- Name: generate_receipt_for_payment(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.generate_receipt_for_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'finance', 'public'
    AS $$
DECLARE
  v_token  TEXT;
  v_number TEXT;
BEGIN
  -- Token: 32 hex chars from a UUID. High entropy, URL-safe.
  v_token := replace(gen_random_uuid()::text, '-', '');

  -- Human-readable: SB-YYYY-NNNNNN.
  v_number := format(
    'SB-%s-%s',
    to_char(NEW.created_at, 'YYYY'),
    lpad(nextval('finance.receipt_number_seq')::text, 6, '0')
  );

  INSERT INTO finance.receipt_verifications (token, payment_id, receipt_number)
  VALUES (v_token, NEW.id, v_number);

  RETURN NULL;
END;
$$;


--
-- Name: FUNCTION generate_receipt_for_payment(); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.generate_receipt_for_payment() IS 'Auto-creates the receipt_verifications row for every payment INSERT (originals + reversals). Fires alongside the M4A status trigger + the M6 ledger writer.';


--
-- Name: get_arrears(uuid); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_arrears(p_scope_id uuid) RETURNS TABLE(member_id uuid, member_name text, charge_id uuid, charge_name text, period_start date, amount_owed numeric, amount_paid numeric, arrears numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
BEGIN
  IF NOT finance.can_read_reports(p_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    o.party_id                              AS member_id,
    m.full_name                             AS member_name,
    o.charge_id                             AS charge_id,
    c.name                                  AS charge_name,
    o.period_start                          AS period_start,
    o.amount                                AS amount_owed,
    COALESCE(paid.paid_sum, 0)              AS amount_paid,
    o.amount - COALESCE(paid.paid_sum, 0)   AS arrears
  FROM finance.obligations o
  JOIN finance.charges c    ON c.id = o.charge_id
  JOIN core.members m       ON m.id = o.party_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(p.amount), 0) AS paid_sum
    FROM finance.payments p
    WHERE p.obligation_id = o.id
      AND p.reverses_payment_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
      )
  ) paid ON TRUE
  WHERE o.scope_id = p_scope_id
    AND o.party_type = 'member'
    AND o.status IN ('open', 'partial')
  ORDER BY (o.amount - COALESCE(paid.paid_sum, 0)) DESC, m.full_name;
END;
$$;


--
-- Name: get_collections(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_collections(p_scope_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT now()) RETURNS TABLE(charge_id uuid, charge_name text, shape text, payment_count bigint, total_collected numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
BEGIN
  IF NOT finance.can_read_reports(p_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id                                    AS charge_id,
    c.name                                  AS charge_name,
    c.shape::text                           AS shape,
    COUNT(p.id)                             AS payment_count,
    COALESCE(SUM(p.amount), 0)              AS total_collected
  FROM finance.charges c
  LEFT JOIN finance.payments p
    ON p.charge_id = c.id
   AND p.reverses_payment_id IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
   )
   AND (p_from IS NULL OR p.created_at >= p_from)
   AND p.created_at <= p_to
  WHERE c.scope_id = p_scope_id
  GROUP BY c.id, c.name, c.shape
  ORDER BY total_collected DESC, c.name;
END;
$$;


--
-- Name: get_contribution_progress(uuid); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_contribution_progress(p_charge_id uuid) RETURNS TABLE(charge_id uuid, charge_name text, shape text, goal_amount numeric, raised numeric, capacity integer, sold bigint, contributor_count bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_scope_id UUID;
BEGIN
  SELECT c.scope_id INTO v_scope_id FROM finance.charges c WHERE c.id = p_charge_id;
  IF v_scope_id IS NULL THEN
    RAISE EXCEPTION 'charge % not found', p_charge_id USING ERRCODE = 'P0002';
  END IF;
  IF NOT finance.can_read_reports(v_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', v_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id                                             AS charge_id,
    c.name                                           AS charge_name,
    c.shape::text                                    AS shape,
    c.goal_amount                                    AS goal_amount,
    COALESCE(pay.raised, 0)                          AS raised,
    c.capacity                                       AS capacity,
    COALESCE(tix.sold, 0)                            AS sold,
    COALESCE(pay.contributors, 0)                    AS contributor_count
  FROM finance.charges c
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(SUM(p.amount), 0)                     AS raised,
      COUNT(DISTINCT p.payer_member_id)              AS contributors
    FROM finance.payments p
    WHERE p.charge_id = c.id
      AND p.reverses_payment_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
      )
  ) pay ON TRUE
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(t.quantity), 0)::bigint AS sold
    FROM finance.tickets t
    WHERE t.charge_id = c.id
  ) tix ON TRUE
  WHERE c.id = p_charge_id;
END;
$$;


--
-- Name: get_donation_report(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_donation_report(p_scope_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT now()) RETURNS TABLE(charge_id uuid, charge_name text, donation_count bigint, named_donor_count bigint, anonymous_count bigint, total_donated numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
BEGIN
  IF NOT finance.can_read_reports(p_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id                                              AS charge_id,
    c.name                                            AS charge_name,
    COUNT(p.id)                                       AS donation_count,
    COUNT(p.id) FILTER (
      WHERE p.payer_member_id IS NOT NULL
         OR (p.metadata->>'donor_name') IS NOT NULL
    )                                                 AS named_donor_count,
    COUNT(p.id) FILTER (
      WHERE p.payer_member_id IS NULL
        AND (p.metadata->>'donor_name') IS NULL
    )                                                 AS anonymous_count,
    COALESCE(SUM(p.amount), 0)                        AS total_donated
  FROM finance.charges c
  LEFT JOIN finance.payments p
    ON p.charge_id = c.id
   AND p.reverses_payment_id IS NULL
   AND NOT EXISTS (
     SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
   )
   AND (p_from IS NULL OR p.created_at >= p_from)
   AND p.created_at <= p_to
  WHERE c.scope_id = p_scope_id
    AND c.shape = 'donation'
  GROUP BY c.id, c.name
  ORDER BY total_donated DESC, c.name;
END;
$$;


--
-- Name: get_exchange_rate(text, text, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_exchange_rate(p_from_currency text, p_to_currency text, p_at timestamp with time zone DEFAULT now()) RETURNS numeric
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'finance', 'public'
    AS $$
DECLARE
  v_rate NUMERIC(20, 8);
BEGIN
  IF p_from_currency = p_to_currency THEN
    RETURN 1;
  END IF;

  SELECT rate INTO v_rate
  FROM finance.exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND effective_at <= p_at
  ORDER BY effective_at DESC
  LIMIT 1;

  RETURN v_rate;   -- NULL if no rate on file — caller decides what to do
END;
$$;


--
-- Name: FUNCTION get_exchange_rate(p_from_currency text, p_to_currency text, p_at timestamp with time zone); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.get_exchange_rate(p_from_currency text, p_to_currency text, p_at timestamp with time zone) IS 'Returns the most recent stored rate for (from, to) with effective_at <= p_at. Same-currency returns 1. NULL when no rate is on file — caller decides whether to raise or default.';


--
-- Name: get_expense_report_by_category(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_expense_report_by_category(p_scope_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT now()) RETURNS TABLE(category_id uuid, category_key text, category_name text, expense_count bigint, total_amount numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
BEGIN
  IF NOT finance.can_read_reports(p_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    e.category_id                              AS category_id,
    ec.key                                     AS category_key,
    ec.name                                    AS category_name,
    COUNT(*)                                   AS expense_count,
    COALESCE(SUM(e.amount), 0)                 AS total_amount
  FROM finance.expenses e
  LEFT JOIN finance.expense_categories ec ON ec.id = e.category_id
  WHERE e.scope_id = p_scope_id
    AND e.status IN ('recorded', 'approved')
    AND e.reverses_expense_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM finance.expenses r WHERE r.reverses_expense_id = e.id
    )
    AND (p_from IS NULL OR e.incurred_at >= p_from)
    AND e.incurred_at <= p_to
  GROUP BY e.category_id, ec.key, ec.name
  ORDER BY total_amount DESC;
END;
$$;


--
-- Name: get_member_statement(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_member_statement(p_member_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT now()) RETURNS TABLE(charge_id uuid, charge_name text, scope_id uuid, scope_name text, period_start date, obligation_status text, amount_owed numeric, amount_paid numeric, balance numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_is_self BOOLEAN;
  v_has_read BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM core.member_accounts ma
    WHERE ma.member_id = p_member_id
      AND ma.auth_user_id = auth.uid()
  ) INTO v_is_self;

  IF NOT v_is_self THEN
    SELECT EXISTS (
      SELECT 1 FROM finance.obligations o
      WHERE o.party_id = p_member_id
        AND o.party_type = 'member'
        AND finance.can_read_reports(o.scope_id)
    ) INTO v_has_read;

    IF NOT v_has_read THEN
      RAISE EXCEPTION 'finance.report for member % denied', p_member_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    o.charge_id                              AS charge_id,
    c.name                                   AS charge_name,
    o.scope_id                               AS scope_id,
    s.name                                   AS scope_name,
    o.period_start                           AS period_start,
    o.status::text                           AS obligation_status,
    o.amount                                 AS amount_owed,
    COALESCE(paid.paid_sum, 0)               AS amount_paid,
    o.amount - COALESCE(paid.paid_sum, 0)    AS balance
  FROM finance.obligations o
  JOIN finance.charges c ON c.id = o.charge_id
  JOIN core.scopes s     ON s.id = o.scope_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(p.amount), 0) AS paid_sum
    FROM finance.payments p
    WHERE p.obligation_id = o.id
      AND p.reverses_payment_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
      )
      AND (p_from IS NULL OR p.created_at >= p_from)
      AND p.created_at <= p_to
  ) paid ON TRUE
  WHERE o.party_id = p_member_id
    AND o.party_type = 'member'
    AND (p_from IS NULL OR o.created_at >= p_from)
    AND o.created_at <= p_to
  ORDER BY o.period_start DESC, c.name;
END;
$$;


--
-- Name: get_payment_method_breakdown(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_payment_method_breakdown(p_scope_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT now()) RETURNS TABLE(method text, payment_count bigint, total_amount numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
BEGIN
  IF NOT finance.can_read_reports(p_scope_id) THEN
    RAISE EXCEPTION 'finance.report at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.method::text                          AS method,
    COUNT(*)                                AS payment_count,
    COALESCE(SUM(p.amount), 0)              AS total_amount
  FROM finance.payments p
  WHERE p.scope_id = p_scope_id
    AND p.reverses_payment_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = p.id
    )
    AND (p_from IS NULL OR p.created_at >= p_from)
    AND p.created_at <= p_to
  GROUP BY p.method
  ORDER BY total_amount DESC;
END;
$$;


--
-- Name: get_treasury_statement(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.get_treasury_statement(p_scope_id uuid, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT now()) RETURNS TABLE(scope_id uuid, currency text, opening_balance numeric, income_sum numeric, expense_sum numeric, closing_balance numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_currency TEXT;
  v_opening  NUMERIC(20, 4);
  v_income   NUMERIC(20, 4);
  v_expense  NUMERIC(20, 4);
BEGIN
  IF NOT (core.has_permission(auth.uid(), p_scope_id, 'treasury.read')
          OR core.has_permission(auth.uid(), p_scope_id, 'finance.read')) THEN
    RAISE EXCEPTION 'treasury.read at scope % denied', p_scope_id
      USING ERRCODE = '42501';
  END IF;

  SELECT s.currency_code INTO v_currency FROM core.scopes s WHERE s.id = p_scope_id;

  IF p_from IS NULL THEN
    v_opening := 0;
  ELSE
    SELECT COALESCE(SUM(CASE le.direction
                          WHEN 'income' THEN le.amount
                          ELSE -le.amount END), 0)
      INTO v_opening
    FROM finance.ledger_entries le
    WHERE le.scope_id = p_scope_id
      AND le.created_at < p_from;
  END IF;

  SELECT
    COALESCE(SUM(CASE le.direction WHEN 'income'  THEN le.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE le.direction WHEN 'expense' THEN le.amount ELSE 0 END), 0)
  INTO v_income, v_expense
  FROM finance.ledger_entries le
  WHERE le.scope_id = p_scope_id
    AND (p_from IS NULL OR le.created_at >= p_from)
    AND le.created_at <= p_to;

  scope_id         := p_scope_id;
  currency         := v_currency;
  opening_balance  := v_opening;
  income_sum       := v_income;
  expense_sum      := v_expense;
  closing_balance  := v_opening + v_income - v_expense;
  RETURN NEXT;
END;
$$;


--
-- Name: FUNCTION get_treasury_statement(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.get_treasury_statement(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) IS 'Treasury statement per spec Part XIII: opening + income + expenses + closing. Auth-gated on treasury.read at the target scope.';


--
-- Name: groups_enforce_mainstream_scope(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.groups_enforce_mainstream_scope() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_mainstream_id UUID;
BEGIN
  SELECT id INTO v_mainstream_id
    FROM core.scopes
   WHERE scope_type = 'mainstream'
   LIMIT 1;
  IF v_mainstream_id IS NULL THEN
    RAISE EXCEPTION 'no mainstream scope configured'
      USING ERRCODE = '22023';
  END IF;
  IF NEW.scope_id <> v_mainstream_id THEN
    RAISE EXCEPTION 'finance.groups.scope_id must be the mainstream scope'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: ledger_entries_block_mutation(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.ledger_entries_block_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'finance.ledger_entries is append-only (% blocked)', TG_OP
    USING ERRCODE = '42501',
          HINT = 'Ledger entries cannot be modified or deleted. Write a new balancing journal instead.';
END;
$$;


--
-- Name: obligations_block_delete(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.obligations_block_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'finance.obligations rows are not deletable'
    USING ERRCODE = '42501',
          HINT = 'Transition status to cancelled or forgiven instead.';
END;
$$;


--
-- Name: obligations_enforce_freeze(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.obligations_enforce_freeze() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.amount             IS DISTINCT FROM OLD.amount             THEN RAISE EXCEPTION 'finance.obligations.amount is frozen'             USING ERRCODE = '42501'; END IF;
  IF NEW.currency           IS DISTINCT FROM OLD.currency           THEN RAISE EXCEPTION 'finance.obligations.currency is frozen'           USING ERRCODE = '42501'; END IF;
  IF NEW.party_type         IS DISTINCT FROM OLD.party_type         THEN RAISE EXCEPTION 'finance.obligations.party_type is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.party_id           IS DISTINCT FROM OLD.party_id           THEN RAISE EXCEPTION 'finance.obligations.party_id is frozen'           USING ERRCODE = '42501'; END IF;
  IF NEW.charge_id          IS DISTINCT FROM OLD.charge_id          THEN RAISE EXCEPTION 'finance.obligations.charge_id is frozen'          USING ERRCODE = '42501'; END IF;
  IF NEW.exception_applied  IS DISTINCT FROM OLD.exception_applied  THEN RAISE EXCEPTION 'finance.obligations.exception_applied is frozen'  USING ERRCODE = '42501'; END IF;
  IF NEW.prorated           IS DISTINCT FROM OLD.prorated           THEN RAISE EXCEPTION 'finance.obligations.prorated is frozen'           USING ERRCODE = '42501'; END IF;
  IF NEW.period_start       IS DISTINCT FROM OLD.period_start       THEN RAISE EXCEPTION 'finance.obligations.period_start is frozen'       USING ERRCODE = '42501'; END IF;
  IF NEW.period_end         IS DISTINCT FROM OLD.period_end         THEN RAISE EXCEPTION 'finance.obligations.period_end is frozen'         USING ERRCODE = '42501'; END IF;
  IF NEW.scope_id           IS DISTINCT FROM OLD.scope_id           THEN RAISE EXCEPTION 'finance.obligations.scope_id is frozen'           USING ERRCODE = '42501'; END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: obligations_recompute_status_from_payments(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.obligations_recompute_status_from_payments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_obligation_id UUID;
  v_amount        NUMERIC(20, 4);
  v_paid          NUMERIC(20, 4);
  v_current_status finance.obligation_status;
BEGIN
  v_obligation_id := NEW.obligation_id;

  IF v_obligation_id IS NULL THEN
    RETURN NULL;   -- payment against a contribution shape, no obligation
  END IF;

  SELECT amount, status
    INTO v_amount, v_current_status
  FROM finance.obligations
  WHERE id = v_obligation_id;

  IF NOT FOUND THEN
    RETURN NULL;   -- shouldn't happen; obligation_id is FK'd
  END IF;

  -- Terminal statuses cancel + forgive stay put — they were set by
  -- independent paths and should not be silently overwritten by
  -- a late payment landing on the row.
  IF v_current_status IN ('cancelled', 'forgiven') THEN
    RETURN NULL;
  END IF;

  -- Sum of non-reversed payments on this obligation.
  --   A payment counts if it's NOT itself a reversal (reverses_payment_id
  --   IS NULL) AND no downstream payment reverses it.
  SELECT COALESCE(SUM(p.amount), 0)
    INTO v_paid
  FROM finance.payments p
  WHERE p.obligation_id = v_obligation_id
    AND p.reverses_payment_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM finance.payments r
      WHERE r.reverses_payment_id = p.id
    );

  -- Derive the target status.
  IF v_paid <= 0 THEN
    UPDATE finance.obligations SET status = 'open' WHERE id = v_obligation_id AND status <> 'open';
  ELSIF v_paid < v_amount THEN
    UPDATE finance.obligations SET status = 'partial' WHERE id = v_obligation_id AND status <> 'partial';
  ELSE
    UPDATE finance.obligations SET status = 'paid' WHERE id = v_obligation_id AND status <> 'paid';
  END IF;

  RETURN NULL;
END;
$$;


--
-- Name: FUNCTION obligations_recompute_status_from_payments(); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.obligations_recompute_status_from_payments() IS 'Derives obligation.status from the sum of non-reversed payments after a payment INSERT. Terminal transitions (cancelled / forgiven) are preserved — this trigger only moves open <-> partial <-> paid. Reversal INSERTs reduce the paid sum via the not-exists subquery.';


--
-- Name: payments_block_mutation(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.payments_block_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'finance.payments is append-only (% blocked)', TG_OP
    USING ERRCODE = '42501',
          HINT = 'Payments cannot be modified or deleted. Insert a reversing payment with reverses_payment_id + a reason.';
END;
$$;


--
-- Name: payments_inherit_group_id(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.payments_inherit_group_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_group_id UUID;
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.charge_id IS NOT NULL THEN
    SELECT group_id INTO v_group_id FROM finance.charges WHERE id = NEW.charge_id;
    IF v_group_id IS NOT NULL THEN
      NEW.group_id := v_group_id;
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.obligation_id IS NOT NULL THEN
    SELECT c.group_id INTO v_group_id
      FROM finance.obligations o
      JOIN finance.charges c ON c.id = o.charge_id
     WHERE o.id = NEW.obligation_id;
    IF v_group_id IS NOT NULL THEN
      NEW.group_id := v_group_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: payments_write_ledger(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.payments_write_ledger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM finance.write_ledger_from_payment(NEW.id);
  RETURN NULL;
END;
$$;


--
-- Name: FUNCTION payments_write_ledger(); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.payments_write_ledger() IS 'Fires finance.write_ledger_from_payment for every payment INSERT so the ledger + treasury stay in sync without an app-layer step.';


--
-- Name: resolve_exception_for_charge(uuid, uuid, timestamp with time zone); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.resolve_exception_for_charge(p_charge_id uuid, p_member_id uuid, p_reference timestamp with time zone DEFAULT now()) RETURNS TABLE(exception_id uuid, replacement_amount numeric, matched_form text, matched_priority integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_batch_id  UUID;
  v_exit_year INT;
  v_ref_year  INT;
BEGIN
  SELECT m.batch_scope_id, m.exit_year
    INTO v_batch_id, v_exit_year
  FROM core.members m
  WHERE m.id = p_member_id;

  IF NOT FOUND THEN
    -- Unknown member; caller falls back to base amount.
    RETURN;
  END IF;

  v_ref_year := EXTRACT(YEAR FROM p_reference)::int;

  RETURN QUERY
  SELECT
    e.id,
    e.replacement_amount,
    e.form::text,
    e.priority
  FROM finance.exceptions e
  WHERE e.charge_id = p_charge_id
    AND e.is_active
    AND (
      -- Individual: e.member_id column matches
      (e.form = 'individual' AND e.member_id = p_member_id)
      OR
      -- Fixed: batch list match
      (e.form = 'fixed'
       AND v_batch_id IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM jsonb_array_elements_text(
           COALESCE(e.condition->'batch_scope_ids', '[]'::jsonb)
         ) AS bs(id)
         WHERE bs.id = v_batch_id::text
       ))
      OR
      -- Relative: recently exited (small years-since-exit)
      (e.form = 'relative'
       AND v_exit_year IS NOT NULL
       AND (e.condition ? 'max_years_since_exit')
       AND (v_ref_year - v_exit_year) <= (e.condition->>'max_years_since_exit')::int
       AND (v_ref_year - v_exit_year) >= 0)
      OR
      -- Senior: exited long ago (large years-since-exit)
      (e.form = 'senior'
       AND v_exit_year IS NOT NULL
       AND (e.condition ? 'min_years_since_exit')
       AND (v_ref_year - v_exit_year) >= (e.condition->>'min_years_since_exit')::int)
    )
  ORDER BY e.priority DESC
  LIMIT 1;
END;
$$;


--
-- Name: FUNCTION resolve_exception_for_charge(p_charge_id uuid, p_member_id uuid, p_reference timestamp with time zone); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.resolve_exception_for_charge(p_charge_id uuid, p_member_id uuid, p_reference timestamp with time zone) IS 'Walks exceptions on a charge by priority DESC and returns the first that matches the member. No stacking (spec judgment #9). Called by generate_obligations_for_charge; the matched exception id is recorded on the obligation.';


--
-- Name: schedule_amount_change(uuid, uuid, numeric, uuid); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.schedule_amount_change(p_charge_id uuid, p_target_scope_id uuid, p_amount numeric, p_actor uuid) RETURNS date
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'finance', 'public'
    AS $$
DECLARE
  v_charge finance.charges%ROWTYPE;
  v_next   DATE;
BEGIN
  SELECT * INTO v_charge FROM finance.charges WHERE id = p_charge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'charge not found: %', p_charge_id USING ERRCODE = 'P0002';
  END IF;
  IF v_charge.recurrence = 'one_time' THEN
    RAISE EXCEPTION 'cannot schedule an amount change on a one-time charge'
      USING ERRCODE = '22023';
  END IF;

  -- Next period start = current period's exclusive end.
  SELECT p.period_end INTO v_next
    FROM finance.compute_period(v_charge.recurrence, v_charge.recurrence_interval, NOW()) p;

  INSERT INTO finance.charge_amount_versions
    (charge_id, target_scope_id, amount, currency, effective_from, created_by)
  VALUES
    (p_charge_id, p_target_scope_id, p_amount, v_charge.currency, v_next, p_actor)
  ON CONFLICT (charge_id, COALESCE(target_scope_id, '00000000-0000-0000-0000-000000000000'::uuid), effective_from)
  DO UPDATE SET amount = EXCLUDED.amount, created_by = EXCLUDED.created_by, created_at = NOW();

  RETURN v_next;
END;
$$;


--
-- Name: FUNCTION schedule_amount_change(p_charge_id uuid, p_target_scope_id uuid, p_amount numeric, p_actor uuid); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.schedule_amount_change(p_charge_id uuid, p_target_scope_id uuid, p_amount numeric, p_actor uuid) IS 'Books a forward-dated amount change effective from next period start; upserts a still-pending change. Rejects one-time charges. Returns the effective date.';


--
-- Name: treasury_balances_enforce_ledger_path(); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.treasury_balances_enforce_ledger_path() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF COALESCE(current_setting('finance.writing_ledger', true), '') <> 'on' THEN
    RAISE EXCEPTION 'finance.treasury_balances is maintained by the ledger-writing path only (% blocked)', TG_OP
      USING ERRCODE = '42501',
            HINT = 'Write via the ledger RPC (finance.write_journal, arriving with M6). Do not UPDATE this table directly.';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: verify_receipt(text); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.verify_receipt(p_token text) RETURNS TABLE(valid boolean, receipt_number text, amount numeric, currency text, paid_at timestamp with time zone, charge_name text, reversed boolean)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'finance', 'public'
    AS $$
DECLARE
  v_payment_id      UUID;
  v_receipt_number  TEXT;
  v_payment_amount  NUMERIC(20, 4);
  v_currency        TEXT;
  v_created_at      TIMESTAMPTZ;
  v_charge_id       UUID;
  v_reverses_id     UUID;
  v_downstream_rev  BOOLEAN;
  v_charge_name     TEXT;
BEGIN
  -- Reject empty / null tokens early with an invalid response — no
  -- error, no info leak beyond "token was invalid."
  IF p_token IS NULL OR length(p_token) < 32 THEN
    valid := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT rv.payment_id, rv.receipt_number
    INTO v_payment_id, v_receipt_number
  FROM finance.receipt_verifications rv
  WHERE rv.token = p_token;

  IF v_payment_id IS NULL THEN
    valid := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT p.amount, p.currency, p.created_at, p.charge_id, p.reverses_payment_id
    INTO v_payment_amount, v_currency, v_created_at, v_charge_id, v_reverses_id
  FROM finance.payments p
  WHERE p.id = v_payment_id;

  -- Should never happen (FK RESTRICT), but defense in depth.
  IF v_payment_amount IS NULL THEN
    valid := FALSE;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_charge_id IS NOT NULL THEN
    SELECT c.name INTO v_charge_name FROM finance.charges c WHERE c.id = v_charge_id;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM finance.payments r WHERE r.reverses_payment_id = v_payment_id
  ) INTO v_downstream_rev;

  valid          := TRUE;
  receipt_number := v_receipt_number;
  amount         := v_payment_amount;
  currency       := v_currency;
  paid_at        := v_created_at;
  charge_name    := COALESCE(v_charge_name, '(unspecified)');
  reversed       := v_downstream_rev OR (v_reverses_id IS NOT NULL);
  RETURN NEXT;
END;
$$;


--
-- Name: FUNCTION verify_receipt(p_token text); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.verify_receipt(p_token text) IS 'Public receipt verification. anon may EXECUTE; the SECURITY DEFINER seam bypasses RLS on receipt_verifications + payments + charges. Returns MINIMAL disclosure only (receipt_number, amount, currency, paid_at, charge_name, valid, reversed) — never the member''s name, never any other payment.';


--
-- Name: write_ledger_from_expense(uuid); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.write_ledger_from_expense(p_expense_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_expense       finance.expenses%ROWTYPE;
  v_direction     finance.ledger_direction;
  v_journal_id    UUID;
  v_scope_currency TEXT;
  v_memo          TEXT;
BEGIN
  SELECT * INTO v_expense FROM finance.expenses WHERE id = p_expense_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'write_ledger_from_expense: expense % not found', p_expense_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_expense.reverses_expense_id IS NULL THEN
    v_direction := 'expense';
    v_memo := format('expense %s', v_expense.id);
  ELSE
    v_direction := 'income';
    v_memo := format('reversal of expense %s', v_expense.reverses_expense_id);
  END IF;

  v_journal_id := gen_random_uuid();

  INSERT INTO finance.ledger_entries
    (journal_id, scope_id, direction, amount, currency, expense_id, memo)
  VALUES
    (v_journal_id, v_expense.scope_id, v_direction, v_expense.amount,
     v_expense.currency, v_expense.id, v_memo);

  SELECT currency_code INTO v_scope_currency FROM core.scopes WHERE id = v_expense.scope_id;
  INSERT INTO finance.treasury_balances (scope_id, balance, currency)
  VALUES (v_expense.scope_id, 0, COALESCE(v_scope_currency, v_expense.currency))
  ON CONFLICT (scope_id) DO NOTHING;

  PERFORM set_config('finance.writing_ledger', 'on', true);

  IF v_direction = 'expense' THEN
    UPDATE finance.treasury_balances
       SET balance = balance - v_expense.amount,
           updated_at = NOW()
     WHERE scope_id = v_expense.scope_id;
  ELSE
    UPDATE finance.treasury_balances
       SET balance = balance + v_expense.amount,
           updated_at = NOW()
     WHERE scope_id = v_expense.scope_id;
  END IF;

  PERFORM set_config('finance.writing_ledger', 'off', true);

  RETURN v_journal_id;
END;
$$;


--
-- Name: FUNCTION write_ledger_from_expense(p_expense_id uuid); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.write_ledger_from_expense(p_expense_id uuid) IS 'Writes a ledger entry + updates the treasury balance for an expense. Direction: expense for records, income for reversals. Guarded by the finance.writing_ledger GUC. Called by expenses INSERT/UPDATE triggers.';


--
-- Name: write_ledger_from_payment(uuid); Type: FUNCTION; Schema: finance; Owner: -
--

CREATE FUNCTION finance.write_ledger_from_payment(p_payment_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'core', 'finance', 'public'
    AS $$
DECLARE
  v_payment       finance.payments%ROWTYPE;
  v_direction     finance.ledger_direction;
  v_journal_id    UUID;
  v_scope_currency TEXT;
  v_memo          TEXT;
BEGIN
  SELECT * INTO v_payment FROM finance.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'write_ledger_from_payment: payment % not found', p_payment_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Direction: reversals leave the treasury; originals arrive.
  IF v_payment.reverses_payment_id IS NULL THEN
    v_direction := 'income';
    v_memo := format('payment %s', v_payment.id);
  ELSE
    v_direction := 'expense';
    v_memo := format('reversal of payment %s', v_payment.reverses_payment_id);
  END IF;

  -- One journal per write. Multi-line balancing journals (e.g. future
  -- cross-scope transfers) would share a journal_id across INSERTs.
  v_journal_id := gen_random_uuid();

  -- INSERT the ledger row. The M1 ledger append-only trigger permits
  -- INSERT; UPDATE + DELETE stay blocked.
  INSERT INTO finance.ledger_entries
    (journal_id, scope_id, direction, amount, currency, payment_id, memo)
  VALUES
    (v_journal_id, v_payment.scope_id, v_direction, v_payment.amount,
     v_payment.currency, v_payment.id, v_memo);

  -- Ensure the balance row exists. INSERT on treasury_balances is
  -- unrestricted; UPDATE needs the finance.writing_ledger GUC.
  SELECT currency_code INTO v_scope_currency FROM core.scopes WHERE id = v_payment.scope_id;
  INSERT INTO finance.treasury_balances (scope_id, balance, currency)
  VALUES (v_payment.scope_id, 0, COALESCE(v_scope_currency, v_payment.currency))
  ON CONFLICT (scope_id) DO NOTHING;

  -- Flip the M1 GUC gate + UPDATE the balance. `is_local := true` keeps
  -- the setting scoped to the current transaction — it evaporates on
  -- COMMIT / ROLLBACK, so a concurrent session never inherits it.
  PERFORM set_config('finance.writing_ledger', 'on', true);

  IF v_direction = 'income' THEN
    UPDATE finance.treasury_balances
       SET balance = balance + v_payment.amount,
           updated_at = NOW()
     WHERE scope_id = v_payment.scope_id;
  ELSE
    UPDATE finance.treasury_balances
       SET balance = balance - v_payment.amount,
           updated_at = NOW()
     WHERE scope_id = v_payment.scope_id;
  END IF;

  -- Reassert the guard for defense in depth. Not strictly needed since
  -- the LOCAL scope lifts the GUC at end-of-transaction, but any
  -- subsequent write inside this same transaction that tries to touch
  -- treasury_balances outside this writer should fail.
  PERFORM set_config('finance.writing_ledger', 'off', true);

  RETURN v_journal_id;
END;
$$;


--
-- Name: FUNCTION write_ledger_from_payment(p_payment_id uuid); Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON FUNCTION finance.write_ledger_from_payment(p_payment_id uuid) IS 'Writes a ledger entry + updates the treasury balance for a payment. Direction: income for originals, expense for reversals. Guarded by the finance.writing_ledger GUC that M1 requires for treasury_balances updates. Called by the payments AFTER INSERT trigger.';


--
-- Name: can_view_delivery(uuid); Type: FUNCTION; Schema: notifications; Owner: -
--

CREATE FUNCTION notifications.can_view_delivery(p_delivery_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'core', 'auth'
    AS $$
DECLARE
  v_recipient_user_id UUID;
  v_scope_id          UUID;
BEGIN
  IF p_delivery_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT e.recipient_user_id, e.scope_id
    INTO v_recipient_user_id, v_scope_id
  FROM notifications.notification_events e
  INNER JOIN notifications.notification_deliveries d ON d.event_id = e.id
  WHERE d.id = p_delivery_id;

  RETURN v_recipient_user_id = auth.uid()
      OR (v_scope_id IS NOT NULL
          AND core.has_permission(auth.uid(), v_scope_id, 'audit.read'));
END;
$$;


--
-- Name: FUNCTION can_view_delivery(p_delivery_id uuid); Type: COMMENT; Schema: notifications; Owner: -
--

COMMENT ON FUNCTION notifications.can_view_delivery(p_delivery_id uuid) IS 'RLS helper for notification_deliveries SELECT. Resolves the delivery to its event and returns TRUE if the caller is the recipient OR has audit.read at the event scope.';


--
-- Name: queue_delete(text, bigint); Type: FUNCTION; Schema: notifications; Owner: -
--

CREATE FUNCTION notifications.queue_delete(p_queue text, p_msg_id bigint) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'pgmq', 'notifications', 'public'
    AS $$
DECLARE
  v_ok BOOLEAN;
BEGIN
  IF p_queue NOT IN ('notification_dispatch', 'email_send', 'sms_send', 'audit_background') THEN
    RAISE EXCEPTION 'unknown queue %', p_queue USING ERRCODE = '22023';
  END IF;

  SELECT pgmq.delete(p_queue, p_msg_id) INTO v_ok;
  RETURN COALESCE(v_ok, FALSE);
END;
$$;


--
-- Name: queue_read(text, integer, integer); Type: FUNCTION; Schema: notifications; Owner: -
--

CREATE FUNCTION notifications.queue_read(p_queue text, p_vt integer, p_qty integer) RETURNS TABLE(msg_id bigint, message jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'pgmq', 'notifications', 'public'
    AS $$
BEGIN
  IF p_queue NOT IN ('notification_dispatch', 'email_send', 'sms_send', 'audit_background') THEN
    RAISE EXCEPTION 'unknown queue %', p_queue USING ERRCODE = '22023';
  END IF;
  IF p_vt IS NULL OR p_vt < 1 OR p_vt > 3600 THEN
    RAISE EXCEPTION 'visibility timeout out of range' USING ERRCODE = '22023';
  END IF;
  IF p_qty IS NULL OR p_qty < 1 OR p_qty > 100 THEN
    RAISE EXCEPTION 'qty out of range' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT r.msg_id, r.message FROM pgmq.read(p_queue, p_vt, p_qty) AS r;
END;
$$;


--
-- Name: queue_send(text, jsonb); Type: FUNCTION; Schema: notifications; Owner: -
--

CREATE FUNCTION notifications.queue_send(p_queue text, p_message jsonb) RETURNS bigint
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'pgmq', 'notifications', 'public'
    AS $$
DECLARE
  v_msg_id BIGINT;
BEGIN
  IF p_queue NOT IN ('notification_dispatch', 'email_send', 'sms_send', 'audit_background') THEN
    RAISE EXCEPTION 'unknown queue %', p_queue USING ERRCODE = '22023';
  END IF;

  SELECT msg_id INTO v_msg_id FROM pgmq.send(p_queue, p_message) AS t(msg_id);
  RETURN v_msg_id;
END;
$$;


--
-- Name: FUNCTION queue_send(p_queue text, p_message jsonb); Type: COMMENT; Schema: notifications; Owner: -
--

COMMENT ON FUNCTION notifications.queue_send(p_queue text, p_message jsonb) IS 'SECURITY DEFINER wrapper over pgmq.send. Exists so the pgmq schema need not be exposed through PostgREST — see the migration header. service_role only.';


--
-- Name: requeue_stranded_events(integer, integer); Type: FUNCTION; Schema: notifications; Owner: -
--

CREATE FUNCTION notifications.requeue_stranded_events(p_older_than_seconds integer DEFAULT 300, p_limit integer DEFAULT 100) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'pgmq', 'notifications', 'public'
    AS $$
DECLARE
  v_event  RECORD;
  v_count  INTEGER := 0;
BEGIN
  FOR v_event IN
    SELECT id FROM notifications.notification_events
     WHERE status = 'pending'
       AND created_at < NOW() - make_interval(secs => p_older_than_seconds)
     ORDER BY created_at
     LIMIT p_limit
  LOOP
    PERFORM pgmq.send('notification_dispatch', jsonb_build_object('eventId', v_event.id));
    UPDATE notifications.notification_events SET status = 'queued' WHERE id = v_event.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


--
-- Name: audit_entries; Type: TABLE; Schema: audit; Owner: -
--

CREATE TABLE audit.audit_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    action text NOT NULL,
    entity_schema text NOT NULL,
    entity_table text NOT NULL,
    entity_id uuid,
    scope_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE audit_entries; Type: COMMENT; Schema: audit; Owner: -
--

COMMENT ON TABLE audit.audit_entries IS 'Append-only event log. Written by audit.log_event(). UPDATE and DELETE are blocked by trigger + role grants.';


--
-- Name: agm_registrations; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.agm_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reference text NOT NULL,
    kind text NOT NULL,
    full_name text NOT NULL,
    email text,
    phone text NOT NULL,
    quantity integer,
    amount_xaf numeric(20,4) NOT NULL,
    attire_size text,
    payment_method text NOT NULL,
    note text,
    settled_at timestamp with time zone,
    settled_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agm_registrations_amount_xaf_check CHECK (((amount_xaf > (0)::numeric) AND (amount_xaf <= (100000000)::numeric))),
    CONSTRAINT agm_registrations_attire_has_size CHECK ((((kind = 'attire'::text) AND (attire_size IS NOT NULL)) OR ((kind <> 'attire'::text) AND (attire_size IS NULL)))),
    CONSTRAINT agm_registrations_attire_size_check CHECK (((attire_size IS NULL) OR (attire_size = ANY (ARRAY['S'::text, 'M'::text, 'L'::text, 'XL'::text, 'XXL'::text])))),
    CONSTRAINT agm_registrations_email_check CHECK (((email IS NULL) OR (length(email) <= 320))),
    CONSTRAINT agm_registrations_full_name_check CHECK (((length(full_name) >= 2) AND (length(full_name) <= 200))),
    CONSTRAINT agm_registrations_kind_check CHECK ((kind = ANY (ARRAY['ticket'::text, 'attire'::text, 'donation'::text]))),
    CONSTRAINT agm_registrations_note_check CHECK (((note IS NULL) OR (length(note) <= 500))),
    CONSTRAINT agm_registrations_payment_method_check CHECK ((payment_method = ANY (ARRAY['mtn-momo'::text, 'orange-money'::text, 'card'::text, 'bank-transfer'::text, 'cash-on-site'::text]))),
    CONSTRAINT agm_registrations_phone_check CHECK (((length(phone) >= 9) AND (length(phone) <= 80))),
    CONSTRAINT agm_registrations_quantity_check CHECK (((quantity IS NULL) OR ((quantity > 0) AND (quantity <= 20)))),
    CONSTRAINT agm_registrations_settlement_consistent CHECK (((settled_at IS NULL) = (settled_by IS NULL))),
    CONSTRAINT agm_registrations_ticket_has_quantity CHECK ((((kind = ANY (ARRAY['ticket'::text, 'attire'::text])) AND (quantity IS NOT NULL)) OR ((kind = 'donation'::text) AND (quantity IS NULL))))
);


--
-- Name: TABLE agm_registrations; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.agm_registrations IS 'AGM 2026 public submissions captured while no payment provider is connected. Writes NOTHING to the finance schema — no payment, ledger entry, obligation or receipt. Finance reconciles by hand until Tranzak is integrated, then this table is retired.';


--
-- Name: COLUMN agm_registrations.payment_method; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON COLUMN cms.agm_registrations.payment_method IS 'The option the visitor selected. An intention, never a settlement — nothing in this table implies money was received.';


--
-- Name: COLUMN agm_registrations.settled_at; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON COLUMN cms.agm_registrations.settled_at IS 'Set by an operator who confirmed payment out-of-band. Not connected to finance.payments by design.';


--
-- Name: article_categories; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.article_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE article_categories; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.article_categories IS 'Article category tags (News, Announcement, Diaspora, …). Editor-managed.';


--
-- Name: article_categories_map; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.article_categories_map (
    article_id uuid NOT NULL,
    category_id uuid NOT NULL
);


--
-- Name: articles; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    content_html text DEFAULT ''::text NOT NULL,
    banner_url text,
    author_name text NOT NULL,
    author_title text,
    author_photo_url text,
    status text DEFAULT 'draft'::text NOT NULL,
    publish_at timestamp with time zone,
    is_featured boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT articles_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'published'::text, 'archived'::text])))
);


--
-- Name: TABLE articles; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.articles IS 'Public-site articles. Rich content stored as HTML. Publish date + optional scheduling; is_featured surfaces on the hero carousel.';


--
-- Name: batch_leaders; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.batch_leaders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch text NOT NULL,
    name text NOT NULL,
    photo_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE batch_leaders; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.batch_leaders IS 'One row per batch year with the batch chair listed. Batch label is UNIQUE — only one chair per batch on the site.';


--
-- Name: branch_leaders; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.branch_leaders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_name text NOT NULL,
    name text NOT NULL,
    region text,
    photo_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE branch_leaders; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.branch_leaders IS 'Curated branch/chapter president list for the Leadership page.';


--
-- Name: diaspora_leaders; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.diaspora_leaders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_name text NOT NULL,
    name text NOT NULL,
    region text,
    photo_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE diaspora_leaders; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.diaspora_leaders IS 'Curated diaspora chapter president list. Same shape as branch_leaders; kept separate so the public page can query each strip independently.';


--
-- Name: gallery_album_categories; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.gallery_album_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE gallery_album_categories; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.gallery_album_categories IS 'Curated tag list for gallery albums (AGM, Homecoming, …). Editor-managed.';


--
-- Name: gallery_album_categories_map; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.gallery_album_categories_map (
    album_id uuid NOT NULL,
    category_id uuid NOT NULL
);


--
-- Name: gallery_albums; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.gallery_albums (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    date_label text,
    location text,
    description text,
    cover_url text,
    photographer text,
    linked_event_id uuid,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE gallery_albums; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.gallery_albums IS 'Public-site albums. Optional linked_event_id ties an album back to a Site Event so the event''s detail page can render a "View album" button.';


--
-- Name: gallery_media; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.gallery_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    album_id uuid NOT NULL,
    kind text NOT NULL,
    src text NOT NULL,
    thumbnail_url text,
    poster_url text,
    alt text,
    aspect text DEFAULT '3/2'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gallery_media_aspect_check CHECK ((aspect = ANY (ARRAY['1/1'::text, '3/4'::text, '4/3'::text, '3/2'::text, '2/3'::text, '16/9'::text, '9/16'::text]))),
    CONSTRAINT gallery_media_kind_check CHECK ((kind = ANY (ARRAY['photo'::text, 'video'::text])))
);


--
-- Name: TABLE gallery_media; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.gallery_media IS 'Photo or video items inside an album. src is the full source URL; poster_url + thumbnail_url are optional variants. CASCADE-deleted with the parent album.';


--
-- Name: mainstream_leaders; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.mainstream_leaders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_id uuid NOT NULL,
    "position" text NOT NULL,
    name text NOT NULL,
    location text,
    photo_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE mainstream_leaders; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.mainstream_leaders IS 'One row per mainstream executive slate member. Ordered inside each sector.';


--
-- Name: mainstream_sectors; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.mainstream_sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    caption text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE mainstream_sectors; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.mainstream_sectors IS 'Groupings of mainstream leaders (Executive, Council Portfolios, Coordinators, Advisory Council). Ordered display.';


--
-- Name: organ_sectors; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.organ_sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE organ_sectors; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.organ_sectors IS 'Top-level groupings for organs (National (Cameroon), Europe, North America, …). Sectors are curated by the Editor.';


--
-- Name: organs; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.organs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    short_name text,
    location text,
    country text,
    founded_year integer,
    member_count integer DEFAULT 0 NOT NULL,
    description text,
    logo_url text,
    contact_email text,
    contact_phone text,
    website_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organs_member_count_check CHECK ((member_count >= 0))
);


--
-- Name: TABLE organs; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.organs IS 'Individual SHESA organs — National body, sectors, branches, chapters. Every organ belongs to a sector (the grouping surfaced on the public page).';


--
-- Name: project_categories; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.project_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE project_categories; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.project_categories IS 'Curated tag list for projects (Education, Health, …). Editor-managed.';


--
-- Name: project_categories_map; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.project_categories_map (
    project_id uuid NOT NULL,
    category_id uuid NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    short_description text,
    description_html text DEFAULT ''::text NOT NULL,
    banner_url text,
    status text DEFAULT 'Planning'::text NOT NULL,
    started_on text,
    location text,
    lead text,
    is_featured boolean DEFAULT false NOT NULL,
    funding_raised numeric(20,2),
    funding_target numeric(20,2),
    funding_currency text,
    milestones jsonb DEFAULT '[]'::jsonb NOT NULL,
    impact_stats jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT projects_funding_raised_check CHECK (((funding_raised IS NULL) OR (funding_raised >= (0)::numeric))),
    CONSTRAINT projects_funding_target_check CHECK (((funding_target IS NULL) OR (funding_target >= (0)::numeric))),
    CONSTRAINT projects_impact_stats_check CHECK ((jsonb_typeof(impact_stats) = 'array'::text)),
    CONSTRAINT projects_milestones_check CHECK ((jsonb_typeof(milestones) = 'array'::text)),
    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['Active'::text, 'Ongoing'::text, 'Planning'::text, 'Fundraising'::text, 'Completed'::text])))
);


--
-- Name: TABLE projects; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.projects IS 'Public-site projects. Rich description in HTML; optional fundraising columns drive the progress bar. Milestones + impact stats are ordered JSONB arrays.';


--
-- Name: site_event_categories; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.site_event_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE site_event_categories; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.site_event_categories IS 'Curated tag list for site events (Reunion, Ceremony, …). Editor-managed.';


--
-- Name: site_event_categories_map; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.site_event_categories_map (
    event_id uuid NOT NULL,
    category_id uuid NOT NULL
);


--
-- Name: site_events; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.site_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    short_description text,
    description_html text DEFAULT ''::text NOT NULL,
    banner_url text,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    location text,
    city text,
    is_featured boolean DEFAULT false NOT NULL,
    has_ticketing boolean DEFAULT false NOT NULL,
    ticket_url text,
    ticket_price numeric(20,2),
    ticket_currency text,
    flyers jsonb DEFAULT '[]'::jsonb NOT NULL,
    program jsonb DEFAULT '[]'::jsonb NOT NULL,
    album_slug text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT site_events_flyers_check CHECK ((jsonb_typeof(flyers) = 'array'::text)),
    CONSTRAINT site_events_program_check CHECK ((jsonb_typeof(program) = 'array'::text)),
    CONSTRAINT site_events_ticket_price_check CHECK (((ticket_price IS NULL) OR (ticket_price >= (0)::numeric)))
);


--
-- Name: TABLE site_events; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.site_events IS 'Public-site events. `is_featured` is unique (only one at a time) via a partial index. Program + flyers are ordered JSONB arrays; ticketing is opt-in with an optional URL, price, currency triple.';


--
-- Name: song_groups; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.song_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE song_groups; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.song_groups IS 'Curated groupings for songs (Anthems, Chapter Songs, Cultural, …). Editor-managed.';


--
-- Name: songs; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.songs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    performer text,
    description text,
    audio_url text NOT NULL,
    cover_url text,
    duration_seconds integer,
    lyrics text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT songs_duration_seconds_check CHECK (((duration_seconds IS NULL) OR (duration_seconds > 0)))
);


--
-- Name: TABLE songs; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.songs IS 'Individual songs in the SHESA catalogue. Every song belongs to exactly one group; audio_url + cover_url are public URLs (self-hosted in cms-audio/cms-media or external CDN links).';


--
-- Name: submission_throttle; Type: TABLE; Schema: cms; Owner: -
--

CREATE TABLE cms.submission_throttle (
    bucket_key text NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    hit_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT submission_throttle_hit_count_check CHECK ((hit_count >= 0))
);


--
-- Name: TABLE submission_throttle; Type: COMMENT; Schema: cms; Owner: -
--

COMMENT ON TABLE cms.submission_throttle IS 'Fixed-window rate-limit counters for anonymous public forms. bucket_key is opaque and caller-supplied (a salted hash of the client IP plus the form name) — never a raw address.';


--
-- Name: batches; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.batches (
    scope_id uuid NOT NULL,
    ordinal integer,
    nickname text,
    description text,
    contact_email text,
    contact_phone text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT batches_email_shape CHECK (((contact_email IS NULL) OR (contact_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'::text))),
    CONSTRAINT batches_nickname_len CHECK (((nickname IS NULL) OR ((char_length(nickname) >= 1) AND (char_length(nickname) <= 80)))),
    CONSTRAINT batches_ordinal_positive CHECK (((ordinal IS NULL) OR (ordinal > 0)))
);


--
-- Name: TABLE batches; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.batches IS 'Batch-only fields. 1:1 with core.scopes via scope_id. `ordinal` is nullable — admins fill it in per batch (school history is discontinuous, no derive-from-year formula holds).';


--
-- Name: COLUMN batches.ordinal; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.batches.ordinal IS 'Manual ordinal position: 1 = first ever batch (1953). Nullable + partial-unique so an admin can seed sparsely.';


--
-- Name: COLUMN batches.nickname; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.batches.nickname IS 'Optional batch nickname (e.g. "Golden Jubilee Batch"). Free text.';


--
-- Name: branches; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.branches (
    scope_id uuid NOT NULL,
    country_code text NOT NULL,
    region text NOT NULL,
    city text NOT NULL,
    nickname text,
    description text,
    registration_fee_required boolean DEFAULT false NOT NULL,
    registration_fee_amount numeric(14,2),
    registration_fee_currency text,
    contact_email text,
    contact_phone text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT branches_country_code_shape CHECK ((country_code ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT branches_registration_fee_amount_required_when_flagged CHECK (((registration_fee_required = false) OR (registration_fee_amount IS NOT NULL))),
    CONSTRAINT branches_registration_fee_currency_shape CHECK (((registration_fee_currency IS NULL) OR (registration_fee_currency ~ '^[A-Z]{3}$'::text)))
);


--
-- Name: TABLE branches; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.branches IS 'Branch-only fields (geography + registration tracking + contact). 1:1 with core.scopes via scope_id.';


--
-- Name: COLUMN branches.country_code; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.branches.country_code IS 'ISO 3166-1 alpha-2 (e.g. CM). Sourced from country-state-city; used to derive the diaspora chip (country != CM).';


--
-- Name: COLUMN branches.region; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.branches.region IS 'Region/state name from country-state-city (free text; not FK-constrained).';


--
-- Name: COLUMN branches.registration_fee_required; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.branches.registration_fee_required IS 'Tracks whether the branch charges a registration fee. NOT a join gate; members can join without paying.';


--
-- Name: chapters; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.chapters (
    scope_id uuid NOT NULL,
    country_code text NOT NULL,
    region text NOT NULL,
    city text NOT NULL,
    nickname text,
    description text,
    registration_fee_required boolean DEFAULT false NOT NULL,
    registration_fee_amount numeric(14,2),
    registration_fee_currency text,
    contact_email text,
    contact_phone text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chapters_country_code_shape CHECK ((country_code ~ '^[A-Z]{2}$'::text)),
    CONSTRAINT chapters_registration_fee_amount_required_when_flagged CHECK (((registration_fee_required = false) OR (registration_fee_amount IS NOT NULL))),
    CONSTRAINT chapters_registration_fee_currency_shape CHECK (((registration_fee_currency IS NULL) OR (registration_fee_currency ~ '^[A-Z]{3}$'::text)))
);


--
-- Name: TABLE chapters; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.chapters IS 'Chapter-only fields. 1:1 with core.scopes via scope_id. chapter_kind on scopes decides whether the registration/contact slots are meaningful (autonomous) or must stay empty (grouping).';


--
-- Name: grouping_chapter_tags; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.grouping_chapter_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    grouping_chapter_scope_id uuid NOT NULL,
    parent_branch_scope_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    removed_by uuid,
    removed_at timestamp with time zone,
    CONSTRAINT grouping_tags_remove_consistent CHECK ((((removed_at IS NULL) AND (removed_by IS NULL)) OR ((removed_at IS NOT NULL) AND (removed_by IS NOT NULL))))
);


--
-- Name: TABLE grouping_chapter_tags; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.grouping_chapter_tags IS 'Tags a branch member as affiliated with a grouping chapter (§3.6). The member''s real membership stays at the parent branch; this tag adds visibility.';


--
-- Name: houses; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.houses (
    scope_id uuid NOT NULL,
    color text NOT NULL,
    color_hex text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT houses_color_hex_shape CHECK ((color_hex ~* '^#[0-9a-f]{3}([0-9a-f]{3}([0-9a-f]{2})?)?$'::text)),
    CONSTRAINT houses_color_is_seeded CHECK ((color = ANY (ARRAY['blue'::text, 'yellow'::text, 'green'::text, 'red'::text])))
);


--
-- Name: TABLE houses; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.houses IS 'House-only fields per the clusters spec. 1:1 with core.scopes via scope_id. Fixed set of four; UI is view-only in Phase 2.';


--
-- Name: COLUMN houses.color; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.houses.color IS 'Canonical color name (blue / yellow / green / red). Members reference their house by scope_id; color is a display attribute here.';


--
-- Name: COLUMN houses.color_hex; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.houses.color_hex IS 'Precise CSS color for accents/badges in the UI. #RGB / #RRGGBB / #RRGGBBAA.';


--
-- Name: COLUMN houses.metadata; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.houses.metadata IS 'Free-form house attributes not yet promoted to typed columns (motto, patron, crest_asset). Read-only in Phase 2.';


--
-- Name: import_batches; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    file_name text NOT NULL,
    storage_path text NOT NULL,
    status core.import_batch_status DEFAULT 'uploaded'::core.import_batch_status NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    valid_rows integer DEFAULT 0 NOT NULL,
    invalid_rows integer DEFAULT 0 NOT NULL,
    duplicate_rows integer DEFAULT 0 NOT NULL,
    created_rows integer DEFAULT 0 NOT NULL,
    parse_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp with time zone,
    confirmed_by uuid,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    CONSTRAINT import_batches_cancel_consistent CHECK ((((status = 'cancelled'::core.import_batch_status) AND (cancelled_at IS NOT NULL) AND (cancelled_by IS NOT NULL)) OR ((status <> 'cancelled'::core.import_batch_status) AND (cancelled_at IS NULL) AND (cancelled_by IS NULL)))),
    CONSTRAINT import_batches_confirm_consistent CHECK ((((status = 'confirmed'::core.import_batch_status) AND (confirmed_at IS NOT NULL) AND (confirmed_by IS NOT NULL)) OR ((status <> 'confirmed'::core.import_batch_status) AND (confirmed_at IS NULL) AND (confirmed_by IS NULL))))
);


--
-- Name: TABLE import_batches; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.import_batches IS 'One row per uploaded member-import .xlsx. Lifecycle guards make confirm-member-import naturally idempotent via WHERE status=validated.';


--
-- Name: import_rows; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.import_rows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    import_batch_id uuid NOT NULL,
    row_number integer NOT NULL,
    raw_data jsonb NOT NULL,
    normalized_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    validation_status core.import_row_status DEFAULT 'pending'::core.import_row_status NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    duplicate_signals jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_member_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE import_rows; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.import_rows IS 'One row per data row in a member-import batch. raw_data + normalized_data + validation_status drive the review UI; confirm-member-import consumes validation_status = valid rows.';


--
-- Name: member_accounts; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.member_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    auth_user_id uuid,
    claim_status core.member_claim_status DEFAULT 'not_invited'::core.member_claim_status NOT NULL,
    invited_at timestamp with time zone,
    claimed_at timestamp with time zone,
    last_invitation_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resent_count integer DEFAULT 0 NOT NULL,
    invite_error text,
    CONSTRAINT member_accounts_claimed_at_matches_status CHECK ((((claim_status = 'claimed'::core.member_claim_status) AND (claimed_at IS NOT NULL) AND (auth_user_id IS NOT NULL)) OR ((claim_status <> 'claimed'::core.member_claim_status) AND (claimed_at IS NULL)))),
    CONSTRAINT member_accounts_invited_at_matches_status CHECK (((invited_at IS NULL) OR (claim_status = ANY (ARRAY['invited'::core.member_claim_status, 'claimed'::core.member_claim_status, 'disabled'::core.member_claim_status]))))
);


--
-- Name: TABLE member_accounts; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.member_accounts IS 'One row per member/auth-user link. Rows may exist without an auth_user_id (member invited but not yet claimed).';


--
-- Name: COLUMN member_accounts.resent_count; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.member_accounts.resent_count IS 'Number of times the invite has been resent from the Invites page. Reset to 0 when a fresh invite goes out; incremented on each Resend action.';


--
-- Name: COLUMN member_accounts.invite_error; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.member_accounts.invite_error IS 'Last error message from the Supabase Auth admin API when attempting to send the invite. Cleared to NULL on a successful (re-)send.';


--
-- Name: members; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    display_name text,
    email text,
    phone text,
    batch_scope_id uuid NOT NULL,
    house_scope_id uuid NOT NULL,
    network_scope_id uuid NOT NULL,
    field text,
    entry_year integer,
    exit_year integer,
    gender text,
    date_of_birth date,
    profile_photo_url text,
    current_country text,
    current_region_state text,
    current_city text,
    member_status core.member_status DEFAULT 'active'::core.member_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    member_code text NOT NULL,
    CONSTRAINT members_contact_required CHECK (((email IS NOT NULL) OR (phone IS NOT NULL))),
    CONSTRAINT members_entry_year_plausible CHECK (((entry_year IS NULL) OR ((entry_year >= 1953) AND (entry_year <= 2100)))),
    CONSTRAINT members_exit_after_entry CHECK (((entry_year IS NULL) OR (exit_year IS NULL) OR (exit_year >= entry_year))),
    CONSTRAINT members_exit_year_plausible CHECK (((exit_year IS NULL) OR ((exit_year >= 1953) AND (exit_year <= 2100))))
);


--
-- Name: TABLE members; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.members IS 'Canonical person record. One row per human. Contact-required, batch+house+sector required as attributes (not memberships). See Phase 1 §3.3.';


--
-- Name: COLUMN members.display_name; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.members.display_name IS 'Member-editable presentation name; falls back to full_name when NULL. full_name is admin-only correctable.';


--
-- Name: COLUMN members.network_scope_id; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.members.network_scope_id IS 'The member''s professional network attribute (formerly "sector"). Every member picks exactly one; "Other" is the safety-net default seeded at 44444444-0000-0000-0000-000000000001.';


--
-- Name: COLUMN members.member_status; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.members.member_status IS 'Person-level status only. Passive/transferred/etc. live on core.memberships (E1.4).';


--
-- Name: COLUMN members.member_code; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.members.member_code IS 'Display id in the shape {batch_year}-{initials}-{4 digits}. Auto-generated by BEFORE INSERT trigger. Unique. NOT NULL after backfill.';


--
-- Name: membership_transfers; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.membership_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    source_scope_id uuid NOT NULL,
    destination_scope_id uuid NOT NULL,
    requested_by uuid,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    status core.membership_transfer_status DEFAULT 'pending'::core.membership_transfer_status NOT NULL,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transfers_approve_consistent CHECK ((((approved_at IS NULL) AND (approved_by IS NULL)) OR ((approved_at IS NOT NULL) AND (approved_by IS NOT NULL)))),
    CONSTRAINT transfers_reject_consistent CHECK ((((rejected_at IS NULL) AND (rejected_by IS NULL)) OR ((rejected_at IS NOT NULL) AND (rejected_by IS NOT NULL)))),
    CONSTRAINT transfers_source_dest_different CHECK ((source_scope_id <> destination_scope_id)),
    CONSTRAINT transfers_status_terminal_columns CHECK ((((status = 'approved'::core.membership_transfer_status) AND (approved_at IS NOT NULL)) OR ((status = 'rejected'::core.membership_transfer_status) AND (rejected_at IS NOT NULL)) OR ((status = 'cancelled'::core.membership_transfer_status) AND (cancelled_at IS NOT NULL)) OR (status = 'pending'::core.membership_transfer_status)))
);


--
-- Name: TABLE membership_transfers; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.membership_transfers IS 'Transfer request lifecycle (§3.7). Approvals delegate to core.perform_transfer for atomicity.';


--
-- Name: memberships; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    scope_id uuid NOT NULL,
    membership_status core.membership_status DEFAULT 'pending'::core.membership_status NOT NULL,
    join_method core.membership_join_method NOT NULL,
    joined_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by uuid,
    rejected_at timestamp with time zone,
    rejected_by uuid,
    left_at timestamp with time zone,
    transferred_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    engagement core.engagement_tier DEFAULT 'normal'::core.engagement_tier NOT NULL,
    CONSTRAINT memberships_approve_consistent CHECK ((((approved_at IS NULL) AND (approved_by IS NULL)) OR ((approved_at IS NOT NULL) AND (approved_by IS NOT NULL)))),
    CONSTRAINT memberships_reject_consistent CHECK ((((rejected_at IS NULL) AND (rejected_by IS NULL)) OR ((rejected_at IS NOT NULL) AND (rejected_by IS NOT NULL)))),
    CONSTRAINT memberships_status_terminal_timestamps CHECK ((((membership_status = ANY (ARRAY['left'::core.membership_status, 'transferred'::core.membership_status])) AND (left_at IS NULL) AND (transferred_at IS NULL)) IS NOT TRUE))
);


--
-- Name: TABLE memberships; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.memberships IS 'Geographic body memberships (branch + autonomous chapters). One active/passive row per member; grouping chapters do not appear here — see core.grouping_chapter_tags.';


--
-- Name: COLUMN memberships.engagement; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.memberships.engagement IS 'Manual devotion tier — dormant / normal / engaged / committed. Admin-set via membership.engagement.set. Default normal. NOT derived from finance or membership_status.';


--
-- Name: networks; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.networks (
    scope_id uuid NOT NULL,
    short_name text NOT NULL,
    description text,
    icon text,
    color_hex text,
    sort_order integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT networks_color_hex_shape CHECK (((color_hex IS NULL) OR (color_hex ~* '^#[0-9a-f]{3}([0-9a-f]{3}([0-9a-f]{2})?)?$'::text))),
    CONSTRAINT networks_short_name_len CHECK (((char_length(short_name) >= 1) AND (char_length(short_name) <= 40)))
);


--
-- Name: TABLE networks; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.networks IS 'Network-only fields. 1:1 with core.scopes via scope_id. Every seeded row + Mainstream-created network has a companion row here.';


--
-- Name: COLUMN networks.short_name; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.networks.short_name IS 'Compact label ("Legal" for "Shesa Legal") used in chips / dropdowns / roster columns. Case-insensitive UNIQUE.';


--
-- Name: COLUMN networks.icon; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.networks.icon IS 'lucide-react key (e.g. "Scale"). UI looks the component up dynamically; invalid keys render a neutral placeholder.';


--
-- Name: permissions; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE permissions; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.permissions IS 'Catalog of resource.action keys checkable via core.has_permission. Mirrors @shesa/types PERMISSION_KEYS literal.';


--
-- Name: COLUMN permissions.key; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.permissions.key IS 'Stable permission key. Naming convention: verb+object (e.g. payment.record, obligation.forgive). State nouns like ''paid'' or ''forgiven'' are enum values, never permission-key strings.';


--
-- Name: position_assignments; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.position_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    member_id uuid NOT NULL,
    scope_id uuid NOT NULL,
    position_catalog_id uuid NOT NULL,
    custom_title text,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    assigned_by uuid,
    removed_at timestamp with time zone,
    removed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT position_assignments_end_after_start CHECK (((ends_at IS NULL) OR (ends_at > starts_at))),
    CONSTRAINT position_assignments_remove_consistent CHECK ((((removed_at IS NULL) AND (removed_by IS NULL)) OR ((removed_at IS NOT NULL) AND (removed_by IS NOT NULL))))
);


--
-- Name: position_catalog; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.position_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope_type core.scope_type NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT position_catalog_scope_type_valid CHECK ((scope_type = ANY (ARRAY['mainstream'::core.scope_type, 'branch'::core.scope_type, 'chapter'::core.scope_type, 'batch'::core.scope_type])))
);


--
-- Name: TABLE position_catalog; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.position_catalog IS 'Catalog of position titles per scope_type (§2.19). Positions are badges only — no permissions attached.';


--
-- Name: profiles; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.profiles (
    id uuid NOT NULL,
    display_name text,
    email text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    preferred_persona text,
    CONSTRAINT profiles_preferred_persona_check CHECK (((preferred_persona IS NULL) OR (preferred_persona = ANY (ARRAY['exco'::text, 'finance'::text, 'editor'::text]))))
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.profiles IS 'User-visible profile fields, 1:1 with auth.users. Linked via shared id.';


--
-- Name: COLUMN profiles.preferred_persona; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.profiles.preferred_persona IS 'Server-side sticky persona choice for the admin app (Phase 2 ADR-0040). Written on every persona switch via Server Action; read on login. NULL = use client-side grant-weighted heuristic. Values: exco / finance / editor.';


--
-- Name: role_assignments; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.role_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    scope_id uuid,
    role_id uuid NOT NULL,
    starts_at timestamp with time zone DEFAULT now() NOT NULL,
    ends_at timestamp with time zone,
    granted_by uuid,
    revoked_at timestamp with time zone,
    revoked_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT role_assignments_revocation_consistent CHECK (((revoked_at IS NULL) = (revoked_by IS NULL))),
    CONSTRAINT role_assignments_window_ordered CHECK (((ends_at IS NULL) OR (ends_at > starts_at)))
);


--
-- Name: TABLE role_assignments; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.role_assignments IS 'Concrete grants of (user, role, scope). Append-only in spirit: revocations set revoked_at/revoked_by rather than deleting the row, so the audit trail survives.';


--
-- Name: COLUMN role_assignments.scope_id; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.role_assignments.scope_id IS 'The scope this grant applies at. NULL means the grant is global (applies at every scope) — used for the Recruiter role per Phase 1 §2.17. Every predicate that filters by scope_id must use (scope_id IS NULL OR scope_id = X) form; scope_id = X alone silently drops global grants.';


--
-- Name: role_history; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.role_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_assignment_id uuid NOT NULL,
    action text NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_by uuid,
    prior_snapshot jsonb,
    audit_entry_id uuid,
    CONSTRAINT role_history_action_check CHECK ((action = ANY (ARRAY['granted'::text, 'revoked'::text, 'expired'::text, 'modified'::text])))
);


--
-- Name: TABLE role_history; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.role_history IS 'Per-record timeline for core.role_assignments. Append-only (UPDATE/DELETE blocked by trigger). Every row links to its audit.audit_entries event.';


--
-- Name: role_permissions; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.role_permissions IS 'Many-to-many: which permissions does each role grant?';


--
-- Name: roles; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE roles; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.roles IS 'Named role keys seeded by Phase 0 + extensible later. `is_system` distinguishes the seeded system roles from any future user-created roles.';


--
-- Name: COLUMN roles.key; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.roles.key IS 'Stable string key used in code (mirrors @shesa/types ROLE_KEYS literal).';


--
-- Name: scope_capabilities; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.scope_capabilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope_id uuid NOT NULL,
    can_manage_members boolean DEFAULT false NOT NULL,
    can_have_treasury boolean DEFAULT false NOT NULL,
    can_create_binding_dues boolean DEFAULT false NOT NULL,
    can_have_website_page boolean DEFAULT false NOT NULL,
    can_have_forum boolean DEFAULT false NOT NULL,
    can_label_active_passive boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE scope_capabilities; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.scope_capabilities IS 'Per-scope feature toggles (treasury, members, forum, etc.). One row per scope; absence means "no capabilities set yet".';


--
-- Name: scopes; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.scopes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    scope_type core.scope_type NOT NULL,
    parent_scope_id uuid,
    currency_code text DEFAULT 'XAF'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    chapter_kind core.chapter_kind,
    entry_year integer,
    nickname text,
    country text,
    region_state text,
    city text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status core.scope_status DEFAULT 'active'::core.scope_status NOT NULL,
    created_by uuid,
    CONSTRAINT scopes_chapter_kind_only_on_chapters CHECK ((((scope_type = 'chapter'::core.scope_type) AND (chapter_kind IS NOT NULL)) OR ((scope_type <> 'chapter'::core.scope_type) AND (chapter_kind IS NULL)))),
    CONSTRAINT scopes_entry_year_only_on_batches CHECK ((((scope_type = 'batch'::core.scope_type) AND (entry_year IS NOT NULL)) OR ((scope_type <> 'batch'::core.scope_type) AND (entry_year IS NULL)))),
    CONSTRAINT scopes_entry_year_plausible CHECK (((entry_year IS NULL) OR ((entry_year >= 1953) AND (entry_year <= 2100)))),
    CONSTRAINT scopes_parent_required_unless_mainstream CHECK (((scope_type = 'mainstream'::core.scope_type) OR (parent_scope_id IS NOT NULL)))
);


--
-- Name: TABLE scopes; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON TABLE core.scopes IS 'Every node in the Shesa org hierarchy: Mainstream → Branch → Chapter → Batch → House, plus Sector (cross-cutting). Parent/child via parent_scope_id.';


--
-- Name: COLUMN scopes.chapter_kind; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.scopes.chapter_kind IS 'Set only when scope_type = ''chapter''. Backfilled from is_autonomous in this migration.';


--
-- Name: COLUMN scopes.entry_year; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.scopes.entry_year IS 'Set only when scope_type = ''batch''. The intake year (1953 → current) that names the cohort.';


--
-- Name: COLUMN scopes.nickname; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.scopes.nickname IS 'Informal batch name. Optional; NULL for non-batch scopes.';


--
-- Name: COLUMN scopes.metadata; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.scopes.metadata IS 'Free-form scope extension bag (e.g. {"color":"blue"} for houses). Prefer typed columns when a value is queried; use metadata only when the field is genuinely opaque to SQL.';


--
-- Name: COLUMN scopes.status; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.scopes.status IS 'Scope lifecycle state. Replaces the pre-2026-07-02 `is_active` boolean. Consumers filter with status = ''active'' rather than is_active = TRUE.';


--
-- Name: COLUMN scopes.created_by; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON COLUMN core.scopes.created_by IS 'The auth user who created this scope. NULL for pre-migration rows + seeded fixtures. Populated by every scope-creating Edge Function going forward.';


--
-- Name: announcements; Type: TABLE; Schema: exco; Owner: -
--

CREATE TABLE exco.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_scope_id uuid NOT NULL,
    title text NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    audience_definition jsonb DEFAULT '{}'::jsonb NOT NULL,
    channels exco.announcement_channel[] DEFAULT ARRAY['in_app'::exco.announcement_channel] NOT NULL,
    expires_at timestamp with time zone,
    status exco.announcement_status DEFAULT 'draft'::exco.announcement_status NOT NULL,
    scheduled_publish_at timestamp with time zone,
    published_at timestamp with time zone,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_audience_size integer,
    CONSTRAINT announcements_channels_in_app_always CHECK (('in_app'::exco.announcement_channel = ANY (channels))),
    CONSTRAINT announcements_expiry_ordered CHECK (((expires_at IS NULL) OR (expires_at > created_at))),
    CONSTRAINT announcements_published_needs_time CHECK (((status <> 'published'::exco.announcement_status) OR (published_at IS NOT NULL))),
    CONSTRAINT announcements_scheduled_needs_time CHECK (((status <> 'scheduled'::exco.announcement_status) OR (scheduled_publish_at IS NOT NULL))),
    CONSTRAINT announcements_title_len CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200)))
);


--
-- Name: TABLE announcements; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TABLE exco.announcements IS 'Phase 2 governance flow. Standalone rich-text messages published to a resolved audience via the shared publishing engine. Admin visibility is siloed on owner_scope_id per ADR-0041. Members do not read this table directly — they read via notifications.notification_deliveries.';


--
-- Name: COLUMN announcements.owner_scope_id; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.announcements.owner_scope_id IS 'Scope the announcement was CREATED at (RLS silo axis per ADR-0041). Not the target audience — that lives in audience_definition.';


--
-- Name: COLUMN announcements.audience_definition; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.announcements.audience_definition IS 'JSONB per packages/domain/audience/ Zod schema. Validated by the Edge Function at write time, NOT by the DB.';


--
-- Name: COLUMN announcements.channels; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.announcements.channels IS 'Selected delivery channels. in_app is always included (CHECK constraint enforced).';


--
-- Name: COLUMN announcements.expires_at; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.announcements.expires_at IS 'Optional auto-archive instant. NULL = stays until manually archived.';


--
-- Name: COLUMN announcements.scheduled_publish_at; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.announcements.scheduled_publish_at IS 'When status = scheduled, this is when publish fires. Required by CHECK for scheduled rows; retained after publish for provenance.';


--
-- Name: COLUMN announcements.resolved_audience_size; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.announcements.resolved_audience_size IS 'Number of members the audience resolver matched at publish time. NULL until the announcement has been published at least once. Used as "Members reached" on the list view — distinct from the delivered-count which is a subset (only members with claimed auth accounts get delivery rows).';


--
-- Name: event_program_items; Type: TABLE; Schema: exco; Owner: -
--

CREATE TABLE exco.event_program_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    starts_at time without time zone NOT NULL,
    title text NOT NULL,
    detail text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_program_items_title_len CHECK (((char_length(title) >= 1) AND (char_length(title) <= 200)))
);


--
-- Name: TABLE event_program_items; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TABLE exco.event_program_items IS 'Structured agenda for an event — rendered as a timeline on the detail page. Ordered by (sort_order, starts_at).';


--
-- Name: event_rsvps; Type: TABLE; Schema: exco; Owner: -
--

CREATE TABLE exco.event_rsvps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    member_id uuid NOT NULL,
    response exco.rsvp_response NOT NULL,
    pledge_amount numeric(12,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT event_rsvps_pledge_nonneg CHECK (((pledge_amount IS NULL) OR (pledge_amount >= (0)::numeric)))
);


--
-- Name: TABLE event_rsvps; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TABLE exco.event_rsvps IS 'Member RSVP responses. Only relevant when the parent event has rsvp_enabled = true (Edge Function checks; RLS + trigger backstops land with the RSVP endpoints in a follow-up).';


--
-- Name: events; Type: TABLE; Schema: exco; Owner: -
--

CREATE TABLE exco.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_scope_id uuid NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    advert_image_urls text[] DEFAULT ARRAY[]::text[] NOT NULL,
    types exco.event_type[] DEFAULT ARRAY[]::exco.event_type[] NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    venue_name text,
    venue_address text,
    venue_map_url text,
    online_url text,
    mode text GENERATED ALWAYS AS (
CASE
    WHEN ((online_url IS NOT NULL) AND (venue_name IS NOT NULL)) THEN 'hybrid'::text
    WHEN (online_url IS NOT NULL) THEN 'online'::text
    ELSE 'physical'::text
END) STORED,
    audience_definition jsonb DEFAULT '{}'::jsonb NOT NULL,
    rsvp_enabled boolean DEFAULT false NOT NULL,
    contribution_charge_id uuid,
    reminder_cadence exco.reminder_cadence,
    reminder_start_at timestamp with time zone,
    reminder_custom_message text,
    status exco.event_status DEFAULT 'draft'::exco.event_status NOT NULL,
    scheduled_publish_at timestamp with time zone,
    published_at timestamp with time zone,
    resolved_audience_size integer,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT events_cadence_needs_start CHECK (((reminder_cadence IS NULL) OR (reminder_start_at IS NOT NULL))),
    CONSTRAINT events_has_location CHECK (((venue_name IS NOT NULL) OR (online_url IS NOT NULL))),
    CONSTRAINT events_name_len CHECK (((char_length(name) >= 1) AND (char_length(name) <= 200))),
    CONSTRAINT events_published_needs_time CHECK (((status <> 'published'::exco.event_status) OR (published_at IS NOT NULL))),
    CONSTRAINT events_schedule_ordered CHECK ((end_at >= start_at)),
    CONSTRAINT events_scheduled_needs_time CHECK (((status <> 'scheduled'::exco.event_status) OR (scheduled_publish_at IS NOT NULL)))
);


--
-- Name: TABLE events; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON TABLE exco.events IS 'Phase 2 governance-flow events. Admin visibility siloed on owner_scope_id per ADR-0041. All writes through supabase/functions/events/* per ADR-0033.';


--
-- Name: COLUMN events.owner_scope_id; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.events.owner_scope_id IS 'Scope the event was CREATED at (RLS silo axis per ADR-0041). NOT the audience target — that lives in audience_definition.';


--
-- Name: COLUMN events.types; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.events.types IS 'Multi-tag classification via exco.event_type[]. Filter chips use ANY(x) / && overlap.';


--
-- Name: COLUMN events.mode; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.events.mode IS 'Derived at write time from venue_name / online_url. STORED so it can index.';


--
-- Name: COLUMN events.rsvp_enabled; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.events.rsvp_enabled IS 'Locked at event creation per product spec — Edge Function rejects updates that flip this on a published event.';


--
-- Name: COLUMN events.contribution_charge_id; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.events.contribution_charge_id IS 'Optional link to finance.charges (Phase 3). The FK constraint lands when finance schema ships; kept nullable UUID now.';


--
-- Name: COLUMN events.reminder_cadence; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.events.reminder_cadence IS 'How often the reminder generator emits a reminder-announcement. NULL = no reminders. Auto-stops at start_at.';


--
-- Name: COLUMN events.resolved_audience_size; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON COLUMN exco.events.resolved_audience_size IS 'Audience size snapshotted at publish. NULL until published — shown as "Members reached" on the list.';


--
-- Name: charge_amount_versions; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.charge_amount_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    charge_id uuid NOT NULL,
    target_scope_id uuid,
    amount numeric(20,4) NOT NULL,
    currency text NOT NULL,
    effective_from date NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT charge_amount_versions_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: TABLE charge_amount_versions; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.charge_amount_versions IS 'Scheduled forward-dated amount changes for a charge. base_amount / charge_targets.amount are version 0; rows here are subsequent changes effective_from a future period start. Read via finance.effective_amount at generation time.';


--
-- Name: charge_categories; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.charge_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE charge_categories; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.charge_categories IS 'Seeded + Mainstream-editable charge categories (dues, levy, registration, AGM, project fund, emergency fund, other).';


--
-- Name: charge_targets; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.charge_targets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    charge_id uuid NOT NULL,
    target_scope_id uuid NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT charge_targets_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT charge_targets_currency_check CHECK ((length(currency) = 3))
);


--
-- Name: TABLE charge_targets; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.charge_targets IS 'Per-target amount overrides for group-shape charges (target_party_type=branch). Rows point at core.scopes — branches or batches. Ignored for individual charges.';


--
-- Name: charges; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope_id uuid NOT NULL,
    category_id uuid,
    shape finance.charge_shape NOT NULL,
    name text NOT NULL,
    description text,
    base_amount numeric(20,4),
    currency text NOT NULL,
    recurrence finance.charge_recurrence DEFAULT 'one_time'::finance.charge_recurrence NOT NULL,
    recurrence_interval integer DEFAULT 1 NOT NULL,
    target_filter jsonb DEFAULT '{}'::jsonb NOT NULL,
    target_party_type finance.party_type,
    event_id uuid,
    open_date timestamp with time zone,
    close_date timestamp with time zone,
    goal_amount numeric(20,4),
    min_amount numeric(20,4),
    capacity integer,
    lifecycle finance.contribution_lifecycle,
    issue_date timestamp with time zone,
    activation_date timestamp with time zone,
    status finance.charge_status DEFAULT 'draft'::finance.charge_status NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    group_id uuid,
    CONSTRAINT charges_base_amount_check CHECK (((base_amount IS NULL) OR (base_amount >= (0)::numeric))),
    CONSTRAINT charges_capacity_check CHECK (((capacity IS NULL) OR (capacity > 0))),
    CONSTRAINT charges_capacity_only_ticketed CHECK (((capacity IS NULL) OR (shape = 'ticketed'::finance.charge_shape))),
    CONSTRAINT charges_close_after_open CHECK (((open_date IS NULL) OR (close_date IS NULL) OR (close_date >= open_date))),
    CONSTRAINT charges_contribution_has_lifecycle CHECK ((((shape = ANY (ARRAY['goal'::finance.charge_shape, 'open'::finance.charge_shape, 'ticketed'::finance.charge_shape, 'fixed'::finance.charge_shape, 'donation'::finance.charge_shape])) AND (lifecycle IS NOT NULL)) OR ((shape = 'charge'::finance.charge_shape) AND (lifecycle IS NULL)))),
    CONSTRAINT charges_goal_amount_check CHECK (((goal_amount IS NULL) OR (goal_amount > (0)::numeric))),
    CONSTRAINT charges_goal_only_goal_shape CHECK (((goal_amount IS NULL) OR (shape = 'goal'::finance.charge_shape))),
    CONSTRAINT charges_min_amount_check CHECK (((min_amount IS NULL) OR (min_amount >= (0)::numeric))),
    CONSTRAINT charges_recurrence_interval_check CHECK ((recurrence_interval >= 1))
);


--
-- Name: TABLE charges; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.charges IS 'Every financial intent: charges, contributions, tickets, donations. Shape column selects behavior. Creator scope must be a finance-bearing body (mainstream / branch / autonomous chapter) — enforced by the create-charge Edge Function landing in M2.';


--
-- Name: contribution_extensions; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.contribution_extensions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    charge_id uuid NOT NULL,
    previous_close_at timestamp with time zone NOT NULL,
    new_close_at timestamp with time zone NOT NULL,
    extended_by uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contribution_extensions_new_after_previous CHECK ((new_close_at > previous_close_at))
);


--
-- Name: exceptions; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    charge_id uuid NOT NULL,
    form finance.exception_form NOT NULL,
    condition jsonb DEFAULT '{}'::jsonb NOT NULL,
    replacement_amount numeric(20,4) NOT NULL,
    priority integer NOT NULL,
    member_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exceptions_individual_has_member CHECK ((((form = 'individual'::finance.exception_form) AND (member_id IS NOT NULL)) OR ((form <> 'individual'::finance.exception_form) AND (member_id IS NULL)))),
    CONSTRAINT exceptions_replacement_amount_check CHECK ((replacement_amount >= (0)::numeric))
);


--
-- Name: TABLE exceptions; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.exceptions IS 'Condition + replacement amount attached to a charge. Resolver walks by priority DESC and takes the first match — never the union (spec judgment call #9, no stacking).';


--
-- Name: exchange_rates; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_currency text NOT NULL,
    to_currency text NOT NULL,
    rate numeric(20,8) NOT NULL,
    set_by uuid,
    effective_at timestamp with time zone DEFAULT now() NOT NULL,
    note text,
    CONSTRAINT exchange_rates_pair_different CHECK ((from_currency <> to_currency)),
    CONSTRAINT exchange_rates_rate_check CHECK ((rate > (0)::numeric))
);


--
-- Name: TABLE exchange_rates; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.exchange_rates IS 'Finance-set exchange rates. Every cross-currency payment/ledger row snapshots its rate on its own row, so past records do not shift when the stored rate updates. Live-rate provider deferred behind the same seam as payments.';


--
-- Name: expense_categories; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE expense_categories; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.expense_categories IS 'Seeded + Mainstream-editable expense categories (venue, transport, printing, fuel, refreshments, honorarium, other).';


--
-- Name: expense_settings; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.expense_settings (
    scope_id uuid NOT NULL,
    approval_threshold_amount numeric(20,4),
    approval_threshold_currency text,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expense_settings_approval_threshold_amount_check CHECK (((approval_threshold_amount IS NULL) OR (approval_threshold_amount >= (0)::numeric))),
    CONSTRAINT expense_settings_threshold_pair CHECK ((((approval_threshold_amount IS NULL) AND (approval_threshold_currency IS NULL)) OR ((approval_threshold_amount IS NOT NULL) AND (approval_threshold_currency IS NOT NULL))))
);


--
-- Name: TABLE expense_settings; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.expense_settings IS 'Per-body optional expense approval threshold. NULL = Finance''s word final (default). When set, expenses above the amount enter pending_approval and the Admin (President) approves.';


--
-- Name: expenses; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope_id uuid NOT NULL,
    category_id uuid,
    payee text NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency text NOT NULL,
    description text,
    attachment_url text,
    status finance.expense_status DEFAULT 'recorded'::finance.expense_status NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    recorded_by uuid,
    reverses_expense_id uuid,
    reversal_reason text,
    incurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    group_id uuid,
    CONSTRAINT expenses_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT expenses_approved_pair CHECK ((((approved_by IS NULL) AND (approved_at IS NULL)) OR ((approved_by IS NOT NULL) AND (approved_at IS NOT NULL)))),
    CONSTRAINT expenses_reversal_has_reason CHECK (((reverses_expense_id IS NULL) OR (reversal_reason IS NOT NULL)))
);


--
-- Name: TABLE expenses; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.expenses IS 'Money out of a treasury. Append-only (trigger in next migration); corrections are reversing rows via reverses_expense_id.';


--
-- Name: groups; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    starts_on date,
    ends_on date,
    status text DEFAULT 'active'::text NOT NULL,
    show_in_sidebar boolean DEFAULT true NOT NULL,
    scope_id uuid NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT groups_check CHECK (((ends_on IS NULL) OR (starts_on IS NULL) OR (ends_on >= starts_on))),
    CONSTRAINT groups_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 200))),
    CONSTRAINT groups_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{0,80}$'::text)),
    CONSTRAINT groups_status_check CHECK ((status = ANY (ARRAY['active'::text, 'closed'::text, 'archived'::text])))
);


--
-- Name: TABLE groups; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.groups IS 'Event-scoped lens over finance activity (AGM 2026, Homecoming 2027, …). Mainstream-scope only. Group data still appears in the general finance pages; the group is a filter, not a silo.';


--
-- Name: ledger_entries; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.ledger_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journal_id uuid NOT NULL,
    scope_id uuid NOT NULL,
    direction finance.ledger_direction NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency text NOT NULL,
    payment_id uuid,
    expense_id uuid,
    memo text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ledger_entries_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT ledger_entries_one_source CHECK (((((payment_id IS NOT NULL))::integer + ((expense_id IS NOT NULL))::integer) = 1))
);


--
-- Name: TABLE ledger_entries; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.ledger_entries IS 'Append-only double-entry journal. journal_id links both sides of a balancing write. Treasury balances are derived from these rows. Never surfaced in UI as "ledger" — the secretary sees Treasury Statements only.';


--
-- Name: obligations; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.obligations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    charge_id uuid NOT NULL,
    scope_id uuid NOT NULL,
    party_type finance.party_type NOT NULL,
    party_id uuid NOT NULL,
    amount numeric(20,4) NOT NULL,
    currency text NOT NULL,
    exception_applied uuid,
    status finance.obligation_status DEFAULT 'open'::finance.obligation_status NOT NULL,
    prorated boolean DEFAULT false NOT NULL,
    period_start date,
    period_end date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT obligations_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: TABLE obligations; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.obligations IS 'Hidden layer — surfaces only as "who owes / arrears / a member''s balance." Amount, party, and exception_applied are frozen on INSERT by trigger; only status transitions.';


--
-- Name: payment_intents; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.payment_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    obligation_id uuid,
    charge_id uuid,
    scope_id uuid NOT NULL,
    payer_member_id uuid,
    amount numeric(20,4) NOT NULL,
    currency text NOT NULL,
    method finance.payment_method NOT NULL,
    status finance.payment_intent_status DEFAULT 'pending'::finance.payment_intent_status NOT NULL,
    available_from timestamp with time zone DEFAULT now() NOT NULL,
    resulting_payment_id uuid,
    failure_reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payer_name text,
    payer_email text,
    payer_phone text,
    payer_location text,
    quantity integer,
    note text,
    CONSTRAINT payment_intents_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payment_intents_lengths_bounded CHECK ((((payer_name IS NULL) OR (length(payer_name) <= 200)) AND ((payer_email IS NULL) OR (length(payer_email) <= 320)) AND ((payer_phone IS NULL) OR (length(payer_phone) <= 80)) AND ((payer_location IS NULL) OR (length(payer_location) <= 300)) AND ((note IS NULL) OR (length(note) <= 500)))),
    CONSTRAINT payment_intents_targets_something CHECK (((obligation_id IS NOT NULL) OR (charge_id IS NOT NULL))),
    CONSTRAINT payment_intents_terminal_has_resulting_payment CHECK ((((status = 'succeeded'::finance.payment_intent_status) AND (resulting_payment_id IS NOT NULL)) OR (status <> 'succeeded'::finance.payment_intent_status)))
);


--
-- Name: TABLE payment_intents; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.payment_intents IS 'Persistent intent state for the payment provider seam. The M1 domain SimulatedProvider stores intents in-memory; this table survives across processes. Real MTN/Orange/card providers reuse the same table when they land.';


--
-- Name: payments; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    obligation_id uuid,
    charge_id uuid,
    scope_id uuid NOT NULL,
    payer_member_id uuid,
    amount numeric(20,4) NOT NULL,
    currency text NOT NULL,
    rate_snapshot numeric(20,8),
    rate_target_currency text,
    method finance.payment_method NOT NULL,
    source finance.payment_source NOT NULL,
    recorded_by uuid,
    reverses_payment_id uuid,
    reversal_reason text,
    external_ref text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    group_id uuid,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_rate_pair_or_neither CHECK ((((rate_snapshot IS NULL) AND (rate_target_currency IS NULL)) OR ((rate_snapshot IS NOT NULL) AND (rate_target_currency IS NOT NULL)))),
    CONSTRAINT payments_rate_snapshot_check CHECK (((rate_snapshot IS NULL) OR (rate_snapshot > (0)::numeric))),
    CONSTRAINT payments_reversal_has_reason CHECK (((reverses_payment_id IS NULL) OR (reversal_reason IS NOT NULL))),
    CONSTRAINT payments_targets_something CHECK (((obligation_id IS NOT NULL) OR (charge_id IS NOT NULL)))
);


--
-- Name: TABLE payments; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.payments IS 'Append-only settlements. Neither amount nor payer editable after INSERT (trigger in next migration). Corrections are reversing rows via reverses_payment_id.';


--
-- Name: receipt_number_seq; Type: SEQUENCE; Schema: finance; Owner: -
--

CREATE SEQUENCE finance.receipt_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SEQUENCE receipt_number_seq; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON SEQUENCE finance.receipt_number_seq IS 'Monotonic sequence for the numeric tail of receipt numbers (SB-YYYY-NNNNNN). Not per-year — a global sequence is simpler and the year prefix disambiguates.';


--
-- Name: receipt_verifications; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.receipt_verifications (
    token text NOT NULL,
    payment_id uuid NOT NULL,
    receipt_number text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE receipt_verifications; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.receipt_verifications IS 'Public verification lookup for printed receipt QR codes. Token resolves to a minimal-disclosure payment view — never the member''s full history.';


--
-- Name: reconciliations; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.reconciliations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    reconciled_by uuid NOT NULL,
    reconciled_at timestamp with time zone DEFAULT now() NOT NULL,
    matched_ref text,
    notes text,
    CONSTRAINT reconciliations_matched_ref_check CHECK (((matched_ref IS NULL) OR (length(matched_ref) <= 200))),
    CONSTRAINT reconciliations_notes_check CHECK (((notes IS NULL) OR (length(notes) <= 1000)))
);


--
-- Name: TABLE reconciliations; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.reconciliations IS 'Presence marker: a payment is reconciled iff a row exists here. Simple by design — the Transactions UI drives it as a column, a row action, a mass action, and a filter chip. No status enum.';


--
-- Name: tickets; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    charge_id uuid NOT NULL,
    payment_id uuid NOT NULL,
    buyer_member_id uuid,
    quantity integer NOT NULL,
    unit_price numeric(20,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tickets_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT tickets_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: TABLE tickets; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.tickets IS 'A ticket purchase — quantity + unit price. Capacity enforcement (against charges.capacity) lands with the buy-tickets edge function.';


--
-- Name: treasury_balances; Type: TABLE; Schema: finance; Owner: -
--

CREATE TABLE finance.treasury_balances (
    scope_id uuid NOT NULL,
    balance numeric(20,4) DEFAULT 0 NOT NULL,
    currency text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE treasury_balances; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON TABLE finance.treasury_balances IS 'Materialized balance per finance-bearing scope (mainstream/branch/autonomous-chapter). Maintained by the ledger-writing path. Never edited directly.';


--
-- Name: notification_deliveries; Type: TABLE; Schema: notifications; Owner: -
--

CREATE TABLE notifications.notification_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    channel text NOT NULL,
    provider text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    idempotency_key text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_attempt_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_deliveries_channel_check CHECK ((channel = ANY (ARRAY['in_app'::text, 'email'::text, 'sms'::text, 'push'::text]))),
    CONSTRAINT notification_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'retrying'::text])))
);


--
-- Name: TABLE notification_deliveries; Type: COMMENT; Schema: notifications; Owner: -
--

COMMENT ON TABLE notifications.notification_deliveries IS 'Per-channel delivery attempts for a notification_event. UNIQUE idempotency_key makes retries safe (INSERT ... ON CONFLICT DO NOTHING pattern).';


--
-- Name: notification_events; Type: TABLE; Schema: notifications; Owner: -
--

CREATE TABLE notifications.notification_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    severity text NOT NULL,
    recipient_user_id uuid,
    recipient_email text,
    recipient_phone text,
    scope_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_events_has_recipient CHECK (((recipient_user_id IS NOT NULL) OR (recipient_email IS NOT NULL) OR (recipient_phone IS NOT NULL))),
    CONSTRAINT notification_events_severity_check CHECK ((severity = ANY (ARRAY['critical'::text, 'important'::text, 'info'::text]))),
    CONSTRAINT notification_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'queued'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: TABLE notification_events; Type: COMMENT; Schema: notifications; Owner: -
--

COMMENT ON TABLE notifications.notification_events IS 'The intent to notify. One row per "we want to notify someone". Dispatch fans out into notification_deliveries.';


--
-- Name: audit_entries audit_entries_pkey; Type: CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_entries
    ADD CONSTRAINT audit_entries_pkey PRIMARY KEY (id);


--
-- Name: agm_registrations agm_registrations_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.agm_registrations
    ADD CONSTRAINT agm_registrations_pkey PRIMARY KEY (id);


--
-- Name: agm_registrations agm_registrations_reference_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.agm_registrations
    ADD CONSTRAINT agm_registrations_reference_key UNIQUE (reference);


--
-- Name: article_categories_map article_categories_map_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.article_categories_map
    ADD CONSTRAINT article_categories_map_pkey PRIMARY KEY (article_id, category_id);


--
-- Name: article_categories article_categories_name_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.article_categories
    ADD CONSTRAINT article_categories_name_key UNIQUE (name);


--
-- Name: article_categories article_categories_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.article_categories
    ADD CONSTRAINT article_categories_pkey PRIMARY KEY (id);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: articles articles_slug_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.articles
    ADD CONSTRAINT articles_slug_key UNIQUE (slug);


--
-- Name: batch_leaders batch_leaders_batch_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.batch_leaders
    ADD CONSTRAINT batch_leaders_batch_key UNIQUE (batch);


--
-- Name: batch_leaders batch_leaders_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.batch_leaders
    ADD CONSTRAINT batch_leaders_pkey PRIMARY KEY (id);


--
-- Name: branch_leaders branch_leaders_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.branch_leaders
    ADD CONSTRAINT branch_leaders_pkey PRIMARY KEY (id);


--
-- Name: diaspora_leaders diaspora_leaders_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.diaspora_leaders
    ADD CONSTRAINT diaspora_leaders_pkey PRIMARY KEY (id);


--
-- Name: gallery_album_categories_map gallery_album_categories_map_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_album_categories_map
    ADD CONSTRAINT gallery_album_categories_map_pkey PRIMARY KEY (album_id, category_id);


--
-- Name: gallery_album_categories gallery_album_categories_name_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_album_categories
    ADD CONSTRAINT gallery_album_categories_name_key UNIQUE (name);


--
-- Name: gallery_album_categories gallery_album_categories_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_album_categories
    ADD CONSTRAINT gallery_album_categories_pkey PRIMARY KEY (id);


--
-- Name: gallery_albums gallery_albums_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_albums
    ADD CONSTRAINT gallery_albums_pkey PRIMARY KEY (id);


--
-- Name: gallery_albums gallery_albums_slug_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_albums
    ADD CONSTRAINT gallery_albums_slug_key UNIQUE (slug);


--
-- Name: gallery_media gallery_media_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_media
    ADD CONSTRAINT gallery_media_pkey PRIMARY KEY (id);


--
-- Name: mainstream_leaders mainstream_leaders_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.mainstream_leaders
    ADD CONSTRAINT mainstream_leaders_pkey PRIMARY KEY (id);


--
-- Name: mainstream_sectors mainstream_sectors_name_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.mainstream_sectors
    ADD CONSTRAINT mainstream_sectors_name_key UNIQUE (name);


--
-- Name: mainstream_sectors mainstream_sectors_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.mainstream_sectors
    ADD CONSTRAINT mainstream_sectors_pkey PRIMARY KEY (id);


--
-- Name: organ_sectors organ_sectors_name_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.organ_sectors
    ADD CONSTRAINT organ_sectors_name_key UNIQUE (name);


--
-- Name: organ_sectors organ_sectors_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.organ_sectors
    ADD CONSTRAINT organ_sectors_pkey PRIMARY KEY (id);


--
-- Name: organ_sectors organ_sectors_slug_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.organ_sectors
    ADD CONSTRAINT organ_sectors_slug_key UNIQUE (slug);


--
-- Name: organs organs_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.organs
    ADD CONSTRAINT organs_pkey PRIMARY KEY (id);


--
-- Name: organs organs_slug_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.organs
    ADD CONSTRAINT organs_slug_key UNIQUE (slug);


--
-- Name: project_categories_map project_categories_map_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.project_categories_map
    ADD CONSTRAINT project_categories_map_pkey PRIMARY KEY (project_id, category_id);


--
-- Name: project_categories project_categories_name_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.project_categories
    ADD CONSTRAINT project_categories_name_key UNIQUE (name);


--
-- Name: project_categories project_categories_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.project_categories
    ADD CONSTRAINT project_categories_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projects projects_slug_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.projects
    ADD CONSTRAINT projects_slug_key UNIQUE (slug);


--
-- Name: site_event_categories_map site_event_categories_map_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.site_event_categories_map
    ADD CONSTRAINT site_event_categories_map_pkey PRIMARY KEY (event_id, category_id);


--
-- Name: site_event_categories site_event_categories_name_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.site_event_categories
    ADD CONSTRAINT site_event_categories_name_key UNIQUE (name);


--
-- Name: site_event_categories site_event_categories_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.site_event_categories
    ADD CONSTRAINT site_event_categories_pkey PRIMARY KEY (id);


--
-- Name: site_events site_events_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.site_events
    ADD CONSTRAINT site_events_pkey PRIMARY KEY (id);


--
-- Name: site_events site_events_slug_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.site_events
    ADD CONSTRAINT site_events_slug_key UNIQUE (slug);


--
-- Name: song_groups song_groups_name_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.song_groups
    ADD CONSTRAINT song_groups_name_key UNIQUE (name);


--
-- Name: song_groups song_groups_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.song_groups
    ADD CONSTRAINT song_groups_pkey PRIMARY KEY (id);


--
-- Name: song_groups song_groups_slug_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.song_groups
    ADD CONSTRAINT song_groups_slug_key UNIQUE (slug);


--
-- Name: songs songs_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.songs
    ADD CONSTRAINT songs_pkey PRIMARY KEY (id);


--
-- Name: songs songs_slug_key; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.songs
    ADD CONSTRAINT songs_slug_key UNIQUE (slug);


--
-- Name: submission_throttle submission_throttle_pkey; Type: CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.submission_throttle
    ADD CONSTRAINT submission_throttle_pkey PRIMARY KEY (bucket_key);


--
-- Name: batches batches_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.batches
    ADD CONSTRAINT batches_pkey PRIMARY KEY (scope_id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (scope_id);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (scope_id);


--
-- Name: grouping_chapter_tags grouping_chapter_tags_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.grouping_chapter_tags
    ADD CONSTRAINT grouping_chapter_tags_pkey PRIMARY KEY (id);


--
-- Name: houses houses_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.houses
    ADD CONSTRAINT houses_pkey PRIMARY KEY (scope_id);


--
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);


--
-- Name: import_rows import_rows_import_batch_id_row_number_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.import_rows
    ADD CONSTRAINT import_rows_import_batch_id_row_number_key UNIQUE (import_batch_id, row_number);


--
-- Name: import_rows import_rows_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.import_rows
    ADD CONSTRAINT import_rows_pkey PRIMARY KEY (id);


--
-- Name: member_accounts member_accounts_auth_user_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.member_accounts
    ADD CONSTRAINT member_accounts_auth_user_id_key UNIQUE (auth_user_id);


--
-- Name: member_accounts member_accounts_member_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.member_accounts
    ADD CONSTRAINT member_accounts_member_id_key UNIQUE (member_id);


--
-- Name: member_accounts member_accounts_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.member_accounts
    ADD CONSTRAINT member_accounts_pkey PRIMARY KEY (id);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: membership_transfers membership_transfers_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.membership_transfers
    ADD CONSTRAINT membership_transfers_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: networks networks_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.networks
    ADD CONSTRAINT networks_pkey PRIMARY KEY (scope_id);


--
-- Name: permissions permissions_key_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.permissions
    ADD CONSTRAINT permissions_key_key UNIQUE (key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: position_assignments position_assignments_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.position_assignments
    ADD CONSTRAINT position_assignments_pkey PRIMARY KEY (id);


--
-- Name: position_catalog position_catalog_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.position_catalog
    ADD CONSTRAINT position_catalog_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: registration_status registration_status_membership_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.registration_status
    ADD CONSTRAINT registration_status_membership_id_key UNIQUE (membership_id);


--
-- Name: registration_status registration_status_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.registration_status
    ADD CONSTRAINT registration_status_pkey PRIMARY KEY (id);


--
-- Name: role_assignments role_assignments_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_assignments
    ADD CONSTRAINT role_assignments_pkey PRIMARY KEY (id);


--
-- Name: role_history role_history_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_history
    ADD CONSTRAINT role_history_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- Name: roles roles_key_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.roles
    ADD CONSTRAINT roles_key_key UNIQUE (key);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: scope_capabilities scope_capabilities_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.scope_capabilities
    ADD CONSTRAINT scope_capabilities_pkey PRIMARY KEY (id);


--
-- Name: scope_capabilities scope_capabilities_scope_id_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.scope_capabilities
    ADD CONSTRAINT scope_capabilities_scope_id_key UNIQUE (scope_id);


--
-- Name: scopes scopes_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.scopes
    ADD CONSTRAINT scopes_pkey PRIMARY KEY (id);


--
-- Name: scopes scopes_slug_type_unique; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.scopes
    ADD CONSTRAINT scopes_slug_type_unique UNIQUE (scope_type, slug);


--
-- Name: CONSTRAINT scopes_slug_type_unique ON scopes; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON CONSTRAINT scopes_slug_type_unique ON core.scopes IS 'Slug uniqueness is per scope_type. E.g. a branch with slug ''shesa-buea'' and an autonomous chapter with slug ''shesa-buea'' can coexist. Consumers construct URLs as /{scope_type}/{slug} so the pair is what matters.';


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: event_program_items event_program_items_pkey; Type: CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.event_program_items
    ADD CONSTRAINT event_program_items_pkey PRIMARY KEY (id);


--
-- Name: event_rsvps event_rsvps_pkey; Type: CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.event_rsvps
    ADD CONSTRAINT event_rsvps_pkey PRIMARY KEY (id);


--
-- Name: event_rsvps event_rsvps_unique_per_member; Type: CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.event_rsvps
    ADD CONSTRAINT event_rsvps_unique_per_member UNIQUE (event_id, member_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: charge_amount_versions charge_amount_versions_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_amount_versions
    ADD CONSTRAINT charge_amount_versions_pkey PRIMARY KEY (id);


--
-- Name: charge_categories charge_categories_key_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_categories
    ADD CONSTRAINT charge_categories_key_key UNIQUE (key);


--
-- Name: charge_categories charge_categories_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_categories
    ADD CONSTRAINT charge_categories_pkey PRIMARY KEY (id);


--
-- Name: charge_targets charge_targets_charge_id_target_scope_id_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_targets
    ADD CONSTRAINT charge_targets_charge_id_target_scope_id_key UNIQUE (charge_id, target_scope_id);


--
-- Name: charge_targets charge_targets_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_targets
    ADD CONSTRAINT charge_targets_pkey PRIMARY KEY (id);


--
-- Name: charges charges_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charges
    ADD CONSTRAINT charges_pkey PRIMARY KEY (id);


--
-- Name: contribution_extensions contribution_extensions_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.contribution_extensions
    ADD CONSTRAINT contribution_extensions_pkey PRIMARY KEY (id);


--
-- Name: exceptions exceptions_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.exceptions
    ADD CONSTRAINT exceptions_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: expense_categories expense_categories_key_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expense_categories
    ADD CONSTRAINT expense_categories_key_key UNIQUE (key);


--
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- Name: expense_settings expense_settings_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expense_settings
    ADD CONSTRAINT expense_settings_pkey PRIMARY KEY (scope_id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: groups groups_slug_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.groups
    ADD CONSTRAINT groups_slug_key UNIQUE (slug);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: obligations obligations_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.obligations
    ADD CONSTRAINT obligations_pkey PRIMARY KEY (id);


--
-- Name: obligations obligations_unique_per_period; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.obligations
    ADD CONSTRAINT obligations_unique_per_period UNIQUE (charge_id, party_type, party_id, period_start);


--
-- Name: payment_intents payment_intents_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: receipt_verifications receipt_verifications_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.receipt_verifications
    ADD CONSTRAINT receipt_verifications_pkey PRIMARY KEY (token);


--
-- Name: receipt_verifications receipt_verifications_receipt_number_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.receipt_verifications
    ADD CONSTRAINT receipt_verifications_receipt_number_key UNIQUE (receipt_number);


--
-- Name: reconciliations reconciliations_payment_id_key; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.reconciliations
    ADD CONSTRAINT reconciliations_payment_id_key UNIQUE (payment_id);


--
-- Name: reconciliations reconciliations_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.reconciliations
    ADD CONSTRAINT reconciliations_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: treasury_balances treasury_balances_pkey; Type: CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.treasury_balances
    ADD CONSTRAINT treasury_balances_pkey PRIMARY KEY (scope_id);


--
-- Name: notification_deliveries notification_deliveries_idempotency_key_key; Type: CONSTRAINT; Schema: notifications; Owner: -
--

ALTER TABLE ONLY notifications.notification_deliveries
    ADD CONSTRAINT notification_deliveries_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: notification_deliveries notification_deliveries_pkey; Type: CONSTRAINT; Schema: notifications; Owner: -
--

ALTER TABLE ONLY notifications.notification_deliveries
    ADD CONSTRAINT notification_deliveries_pkey PRIMARY KEY (id);


--
-- Name: notification_events notification_events_pkey; Type: CONSTRAINT; Schema: notifications; Owner: -
--

ALTER TABLE ONLY notifications.notification_events
    ADD CONSTRAINT notification_events_pkey PRIMARY KEY (id);


--
-- Name: audit_entries_action_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX audit_entries_action_idx ON audit.audit_entries USING btree (action, created_at DESC);


--
-- Name: audit_entries_actor_user_id_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX audit_entries_actor_user_id_idx ON audit.audit_entries USING btree (actor_user_id, created_at DESC);


--
-- Name: audit_entries_entity_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX audit_entries_entity_idx ON audit.audit_entries USING btree (entity_schema, entity_table, entity_id);


--
-- Name: audit_entries_scope_id_idx; Type: INDEX; Schema: audit; Owner: -
--

CREATE INDEX audit_entries_scope_id_idx ON audit.audit_entries USING btree (scope_id, created_at DESC);


--
-- Name: agm_registrations_created_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX agm_registrations_created_idx ON cms.agm_registrations USING btree (created_at DESC);


--
-- Name: agm_registrations_kind_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX agm_registrations_kind_idx ON cms.agm_registrations USING btree (kind);


--
-- Name: agm_registrations_unsettled_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX agm_registrations_unsettled_idx ON cms.agm_registrations USING btree (created_at) WHERE (settled_at IS NULL);


--
-- Name: article_categories_map_cat_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX article_categories_map_cat_idx ON cms.article_categories_map USING btree (category_id);


--
-- Name: articles_featured_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX articles_featured_idx ON cms.articles USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: articles_status_publish_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX articles_status_publish_idx ON cms.articles USING btree (status, publish_at DESC);


--
-- Name: batch_leaders_sort_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX batch_leaders_sort_idx ON cms.batch_leaders USING btree (sort_order);


--
-- Name: branch_leaders_sort_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX branch_leaders_sort_idx ON cms.branch_leaders USING btree (sort_order);


--
-- Name: diaspora_leaders_sort_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX diaspora_leaders_sort_idx ON cms.diaspora_leaders USING btree (sort_order);


--
-- Name: gallery_album_categories_map_cat_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX gallery_album_categories_map_cat_idx ON cms.gallery_album_categories_map USING btree (category_id);


--
-- Name: gallery_albums_event_link_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX gallery_albums_event_link_idx ON cms.gallery_albums USING btree (linked_event_id) WHERE (linked_event_id IS NOT NULL);


--
-- Name: gallery_albums_sort_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX gallery_albums_sort_idx ON cms.gallery_albums USING btree (sort_order);


--
-- Name: gallery_media_album_sort_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX gallery_media_album_sort_idx ON cms.gallery_media USING btree (album_id, sort_order);


--
-- Name: gallery_media_kind_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX gallery_media_kind_idx ON cms.gallery_media USING btree (kind);


--
-- Name: mainstream_leaders_sector_sort_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX mainstream_leaders_sector_sort_idx ON cms.mainstream_leaders USING btree (sector_id, sort_order);


--
-- Name: mainstream_sectors_sort_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX mainstream_sectors_sort_idx ON cms.mainstream_sectors USING btree (sort_order);


--
-- Name: organs_sector_sort_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX organs_sector_sort_idx ON cms.organs USING btree (sector_id, sort_order);


--
-- Name: organs_slug_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX organs_slug_idx ON cms.organs USING btree (slug);


--
-- Name: project_categories_map_cat_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX project_categories_map_cat_idx ON cms.project_categories_map USING btree (category_id);


--
-- Name: projects_featured_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX projects_featured_idx ON cms.projects USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: projects_status_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX projects_status_idx ON cms.projects USING btree (status);


--
-- Name: site_event_categories_map_cat_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX site_event_categories_map_cat_idx ON cms.site_event_categories_map USING btree (category_id);


--
-- Name: site_events_one_featured; Type: INDEX; Schema: cms; Owner: -
--

CREATE UNIQUE INDEX site_events_one_featured ON cms.site_events USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: site_events_starts_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX site_events_starts_idx ON cms.site_events USING btree (starts_at);


--
-- Name: songs_group_sort_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX songs_group_sort_idx ON cms.songs USING btree (group_id, sort_order);


--
-- Name: songs_slug_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX songs_slug_idx ON cms.songs USING btree (slug);


--
-- Name: submission_throttle_window_idx; Type: INDEX; Schema: cms; Owner: -
--

CREATE INDEX submission_throttle_window_idx ON cms.submission_throttle USING btree (window_start);


--
-- Name: batches_ordinal_unique; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX batches_ordinal_unique ON core.batches USING btree (ordinal) WHERE (ordinal IS NOT NULL);


--
-- Name: branches_country_code_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX branches_country_code_idx ON core.branches USING btree (country_code);


--
-- Name: branches_region_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX branches_region_idx ON core.branches USING btree (region);


--
-- Name: chapters_country_code_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX chapters_country_code_idx ON core.chapters USING btree (country_code);


--
-- Name: chapters_region_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX chapters_region_idx ON core.chapters USING btree (region);


--
-- Name: grouping_tags_grouping_chapter_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX grouping_tags_grouping_chapter_idx ON core.grouping_chapter_tags USING btree (grouping_chapter_scope_id);


--
-- Name: grouping_tags_parent_branch_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX grouping_tags_parent_branch_idx ON core.grouping_chapter_tags USING btree (parent_branch_scope_id);


--
-- Name: grouping_tags_unique_active; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX grouping_tags_unique_active ON core.grouping_chapter_tags USING btree (member_id, grouping_chapter_scope_id) WHERE (removed_at IS NULL);


--
-- Name: houses_sort_order_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX houses_sort_order_idx ON core.houses USING btree (sort_order);


--
-- Name: import_batches_scope_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX import_batches_scope_id_idx ON core.import_batches USING btree (scope_id);


--
-- Name: import_batches_status_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX import_batches_status_idx ON core.import_batches USING btree (status);


--
-- Name: import_batches_uploaded_by_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX import_batches_uploaded_by_idx ON core.import_batches USING btree (uploaded_by);


--
-- Name: import_rows_batch_status_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX import_rows_batch_status_idx ON core.import_rows USING btree (import_batch_id, validation_status);


--
-- Name: member_accounts_auth_user_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX member_accounts_auth_user_id_idx ON core.member_accounts USING btree (auth_user_id);


--
-- Name: member_accounts_claim_status_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX member_accounts_claim_status_idx ON core.member_accounts USING btree (claim_status);


--
-- Name: members_fullname_batch_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX members_fullname_batch_idx ON core.members USING btree (full_name, batch_scope_id);


--
-- Name: members_house_scope_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX members_house_scope_id_idx ON core.members USING btree (house_scope_id);


--
-- Name: members_lower_email_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX members_lower_email_idx ON core.members USING btree (lower(email));


--
-- Name: members_member_code_key; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX members_member_code_key ON core.members USING btree (member_code);


--
-- Name: members_network_scope_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX members_network_scope_id_idx ON core.members USING btree (network_scope_id);


--
-- Name: members_phone_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX members_phone_idx ON core.members USING btree (phone);


--
-- Name: members_status_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX members_status_idx ON core.members USING btree (member_status);


--
-- Name: memberships_engagement_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX memberships_engagement_idx ON core.memberships USING btree (engagement);


--
-- Name: memberships_member_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX memberships_member_id_idx ON core.memberships USING btree (member_id);


--
-- Name: memberships_one_active_geographic_per_member; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX memberships_one_active_geographic_per_member ON core.memberships USING btree (member_id) WHERE (membership_status = ANY (ARRAY['active'::core.membership_status, 'passive'::core.membership_status]));


--
-- Name: memberships_scope_id_status_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX memberships_scope_id_status_idx ON core.memberships USING btree (scope_id, membership_status);


--
-- Name: networks_short_name_ci_unique; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX networks_short_name_ci_unique ON core.networks USING btree (lower(short_name));


--
-- Name: networks_sort_order_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX networks_sort_order_idx ON core.networks USING btree (sort_order);


--
-- Name: position_assignments_catalog_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX position_assignments_catalog_idx ON core.position_assignments USING btree (position_catalog_id);


--
-- Name: position_assignments_member_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX position_assignments_member_idx ON core.position_assignments USING btree (member_id);


--
-- Name: position_assignments_one_active_per_member_scope; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX position_assignments_one_active_per_member_scope ON core.position_assignments USING btree (member_id, scope_id) WHERE (removed_at IS NULL);


--
-- Name: INDEX position_assignments_one_active_per_member_scope; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON INDEX core.position_assignments_one_active_per_member_scope IS 'Phase 2 §7 — one active position per (member, scope). Distinct from Phase 1''s (member, scope, position) partial unique.';


--
-- Name: position_assignments_scope_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX position_assignments_scope_idx ON core.position_assignments USING btree (scope_id);


--
-- Name: position_catalog_scope_type_active_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX position_catalog_scope_type_active_idx ON core.position_catalog USING btree (scope_type, is_active);


--
-- Name: position_catalog_scope_type_name_unique; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX position_catalog_scope_type_name_unique ON core.position_catalog USING btree (scope_type, lower(name));


--
-- Name: registration_status_membership_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX registration_status_membership_id_idx ON core.registration_status USING btree (membership_id);


--
-- Name: registration_status_unpaid_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX registration_status_unpaid_idx ON core.registration_status USING btree (membership_id) WHERE (fee_required AND (marked_paid_at IS NULL) AND (waived_at IS NULL));


--
-- Name: role_assignments_scope_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX role_assignments_scope_id_idx ON core.role_assignments USING btree (scope_id);


--
-- Name: role_assignments_unique_active; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX role_assignments_unique_active ON core.role_assignments USING btree (user_id, scope_id, role_id) NULLS NOT DISTINCT WHERE (revoked_at IS NULL);


--
-- Name: role_assignments_user_scope_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX role_assignments_user_scope_idx ON core.role_assignments USING btree (user_id, scope_id);


--
-- Name: role_history_changed_by_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX role_history_changed_by_idx ON core.role_history USING btree (changed_by, changed_at DESC);


--
-- Name: role_history_role_assignment_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX role_history_role_assignment_id_idx ON core.role_history USING btree (role_assignment_id, changed_at DESC);


--
-- Name: role_permissions_permission_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX role_permissions_permission_id_idx ON core.role_permissions USING btree (permission_id);


--
-- Name: scopes_batch_entry_year_unique; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX scopes_batch_entry_year_unique ON core.scopes USING btree (entry_year) WHERE (scope_type = 'batch'::core.scope_type);


--
-- Name: scopes_only_one_mainstream; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX scopes_only_one_mainstream ON core.scopes USING btree ((true)) WHERE (scope_type = 'mainstream'::core.scope_type);


--
-- Name: scopes_parent_scope_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX scopes_parent_scope_id_idx ON core.scopes USING btree (parent_scope_id);


--
-- Name: scopes_type_status_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX scopes_type_status_idx ON core.scopes USING btree (scope_type, status);


--
-- Name: transfers_destination_scope_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX transfers_destination_scope_idx ON core.membership_transfers USING btree (destination_scope_id);


--
-- Name: transfers_member_id_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX transfers_member_id_idx ON core.membership_transfers USING btree (member_id);


--
-- Name: transfers_one_pending_per_member; Type: INDEX; Schema: core; Owner: -
--

CREATE UNIQUE INDEX transfers_one_pending_per_member ON core.membership_transfers USING btree (member_id) WHERE (status = 'pending'::core.membership_transfer_status);


--
-- Name: transfers_source_scope_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX transfers_source_scope_idx ON core.membership_transfers USING btree (source_scope_id);


--
-- Name: transfers_status_idx; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX transfers_status_idx ON core.membership_transfers USING btree (status);


--
-- Name: announcements_created_at_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX announcements_created_at_idx ON exco.announcements USING btree (created_at DESC);


--
-- Name: announcements_expiry_sweep_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX announcements_expiry_sweep_idx ON exco.announcements USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (status = ANY (ARRAY['published'::exco.announcement_status, 'unpublished'::exco.announcement_status])));


--
-- Name: announcements_owner_scope_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX announcements_owner_scope_idx ON exco.announcements USING btree (owner_scope_id);


--
-- Name: announcements_published_at_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX announcements_published_at_idx ON exco.announcements USING btree (published_at DESC) WHERE (published_at IS NOT NULL);


--
-- Name: announcements_scheduled_ready_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX announcements_scheduled_ready_idx ON exco.announcements USING btree (scheduled_publish_at) WHERE (status = 'scheduled'::exco.announcement_status);


--
-- Name: announcements_status_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX announcements_status_idx ON exco.announcements USING btree (status);


--
-- Name: event_program_items_event_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX event_program_items_event_idx ON exco.event_program_items USING btree (event_id, sort_order, starts_at);


--
-- Name: event_rsvps_event_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX event_rsvps_event_idx ON exco.event_rsvps USING btree (event_id);


--
-- Name: event_rsvps_member_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX event_rsvps_member_idx ON exco.event_rsvps USING btree (member_id);


--
-- Name: events_end_at_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX events_end_at_idx ON exco.events USING btree (end_at);


--
-- Name: events_mode_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX events_mode_idx ON exco.events USING btree (mode);


--
-- Name: events_owner_scope_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX events_owner_scope_idx ON exco.events USING btree (owner_scope_id);


--
-- Name: events_reminder_active_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX events_reminder_active_idx ON exco.events USING btree (reminder_start_at) WHERE ((status = 'published'::exco.event_status) AND (reminder_cadence IS NOT NULL));


--
-- Name: events_scheduled_ready_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX events_scheduled_ready_idx ON exco.events USING btree (scheduled_publish_at) WHERE (status = 'scheduled'::exco.event_status);


--
-- Name: events_start_at_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX events_start_at_idx ON exco.events USING btree (start_at);


--
-- Name: events_status_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX events_status_idx ON exco.events USING btree (status);


--
-- Name: events_types_idx; Type: INDEX; Schema: exco; Owner: -
--

CREATE INDEX events_types_idx ON exco.events USING gin (types);


--
-- Name: charge_amount_versions_lookup; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX charge_amount_versions_lookup ON finance.charge_amount_versions USING btree (charge_id, target_scope_id, effective_from DESC);


--
-- Name: charge_amount_versions_uniq; Type: INDEX; Schema: finance; Owner: -
--

CREATE UNIQUE INDEX charge_amount_versions_uniq ON finance.charge_amount_versions USING btree (charge_id, COALESCE(target_scope_id, '00000000-0000-0000-0000-000000000000'::uuid), effective_from);


--
-- Name: charge_targets_charge_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX charge_targets_charge_idx ON finance.charge_targets USING btree (charge_id);


--
-- Name: charge_targets_scope_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX charge_targets_scope_idx ON finance.charge_targets USING btree (target_scope_id);


--
-- Name: charges_activation_date_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX charges_activation_date_idx ON finance.charges USING btree (activation_date) WHERE (status = 'active'::finance.charge_status);


--
-- Name: charges_group_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX charges_group_idx ON finance.charges USING btree (group_id) WHERE (group_id IS NOT NULL);


--
-- Name: charges_scope_shape_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX charges_scope_shape_idx ON finance.charges USING btree (scope_id, shape);


--
-- Name: charges_status_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX charges_status_idx ON finance.charges USING btree (status);


--
-- Name: contribution_extensions_charge_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX contribution_extensions_charge_idx ON finance.contribution_extensions USING btree (charge_id, created_at DESC);


--
-- Name: exceptions_charge_priority_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX exceptions_charge_priority_idx ON finance.exceptions USING btree (charge_id, priority DESC);


--
-- Name: exceptions_member_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX exceptions_member_idx ON finance.exceptions USING btree (member_id) WHERE (member_id IS NOT NULL);


--
-- Name: exchange_rates_pair_effective_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX exchange_rates_pair_effective_idx ON finance.exchange_rates USING btree (from_currency, to_currency, effective_at DESC);


--
-- Name: expenses_category_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX expenses_category_idx ON finance.expenses USING btree (category_id);


--
-- Name: expenses_group_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX expenses_group_idx ON finance.expenses USING btree (group_id) WHERE (group_id IS NOT NULL);


--
-- Name: expenses_scope_created_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX expenses_scope_created_idx ON finance.expenses USING btree (scope_id, created_at DESC);


--
-- Name: expenses_status_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX expenses_status_idx ON finance.expenses USING btree (status) WHERE (status = 'pending_approval'::finance.expense_status);


--
-- Name: groups_status_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX groups_status_idx ON finance.groups USING btree (status);


--
-- Name: groups_visible_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX groups_visible_idx ON finance.groups USING btree (show_in_sidebar) WHERE show_in_sidebar;


--
-- Name: ledger_entries_expense_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX ledger_entries_expense_idx ON finance.ledger_entries USING btree (expense_id) WHERE (expense_id IS NOT NULL);


--
-- Name: ledger_entries_journal_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX ledger_entries_journal_idx ON finance.ledger_entries USING btree (journal_id);


--
-- Name: ledger_entries_payment_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX ledger_entries_payment_idx ON finance.ledger_entries USING btree (payment_id) WHERE (payment_id IS NOT NULL);


--
-- Name: ledger_entries_scope_created_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX ledger_entries_scope_created_idx ON finance.ledger_entries USING btree (scope_id, created_at DESC);


--
-- Name: obligations_charge_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX obligations_charge_idx ON finance.obligations USING btree (charge_id);


--
-- Name: obligations_party_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX obligations_party_idx ON finance.obligations USING btree (party_type, party_id);


--
-- Name: obligations_scope_status_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX obligations_scope_status_idx ON finance.obligations USING btree (scope_id, status);


--
-- Name: payment_intents_payer_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX payment_intents_payer_idx ON finance.payment_intents USING btree (payer_member_id) WHERE (payer_member_id IS NOT NULL);


--
-- Name: payment_intents_pending_available_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX payment_intents_pending_available_idx ON finance.payment_intents USING btree (available_from) WHERE (status = 'pending'::finance.payment_intent_status);


--
-- Name: payment_intents_scope_status_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX payment_intents_scope_status_idx ON finance.payment_intents USING btree (scope_id, status);


--
-- Name: payments_charge_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX payments_charge_idx ON finance.payments USING btree (charge_id) WHERE (charge_id IS NOT NULL);


--
-- Name: payments_group_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX payments_group_idx ON finance.payments USING btree (group_id) WHERE (group_id IS NOT NULL);


--
-- Name: payments_obligation_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX payments_obligation_idx ON finance.payments USING btree (obligation_id) WHERE (obligation_id IS NOT NULL);


--
-- Name: payments_payer_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX payments_payer_idx ON finance.payments USING btree (payer_member_id) WHERE (payer_member_id IS NOT NULL);


--
-- Name: payments_reverses_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX payments_reverses_idx ON finance.payments USING btree (reverses_payment_id) WHERE (reverses_payment_id IS NOT NULL);


--
-- Name: payments_scope_created_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX payments_scope_created_idx ON finance.payments USING btree (scope_id, created_at DESC);


--
-- Name: receipt_verifications_payment_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX receipt_verifications_payment_idx ON finance.receipt_verifications USING btree (payment_id);


--
-- Name: reconciliations_by_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX reconciliations_by_idx ON finance.reconciliations USING btree (reconciled_by);


--
-- Name: reconciliations_when_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX reconciliations_when_idx ON finance.reconciliations USING btree (reconciled_at DESC);


--
-- Name: tickets_buyer_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX tickets_buyer_idx ON finance.tickets USING btree (buyer_member_id) WHERE (buyer_member_id IS NOT NULL);


--
-- Name: tickets_charge_idx; Type: INDEX; Schema: finance; Owner: -
--

CREATE INDEX tickets_charge_idx ON finance.tickets USING btree (charge_id);


--
-- Name: notification_deliveries_event_idx; Type: INDEX; Schema: notifications; Owner: -
--

CREATE INDEX notification_deliveries_event_idx ON notifications.notification_deliveries USING btree (event_id);


--
-- Name: notification_deliveries_status_idx; Type: INDEX; Schema: notifications; Owner: -
--

CREATE INDEX notification_deliveries_status_idx ON notifications.notification_deliveries USING btree (status, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'retrying'::text]));


--
-- Name: notification_events_recipient_idx; Type: INDEX; Schema: notifications; Owner: -
--

CREATE INDEX notification_events_recipient_idx ON notifications.notification_events USING btree (recipient_user_id, created_at DESC) WHERE (recipient_user_id IS NOT NULL);


--
-- Name: notification_events_scope_idx; Type: INDEX; Schema: notifications; Owner: -
--

CREATE INDEX notification_events_scope_idx ON notifications.notification_events USING btree (scope_id, created_at DESC) WHERE (scope_id IS NOT NULL);


--
-- Name: notification_events_status_idx; Type: INDEX; Schema: notifications; Owner: -
--

CREATE INDEX notification_events_status_idx ON notifications.notification_events USING btree (status, created_at) WHERE (status = ANY (ARRAY['pending'::text, 'queued'::text]));


--
-- Name: audit_entries audit_entries_block_delete; Type: TRIGGER; Schema: audit; Owner: -
--

CREATE TRIGGER audit_entries_block_delete BEFORE DELETE ON audit.audit_entries FOR EACH ROW EXECUTE FUNCTION audit.audit_entries_block_mutation();


--
-- Name: audit_entries audit_entries_block_update; Type: TRIGGER; Schema: audit; Owner: -
--

CREATE TRIGGER audit_entries_block_update BEFORE UPDATE ON audit.audit_entries FOR EACH ROW EXECUTE FUNCTION audit.audit_entries_block_mutation();


--
-- Name: batches batches_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER batches_set_updated_at BEFORE UPDATE ON core.batches FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: branches branches_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER branches_set_updated_at BEFORE UPDATE ON core.branches FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: chapters chapters_grouping_shape_check; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER chapters_grouping_shape_check BEFORE INSERT OR UPDATE ON core.chapters FOR EACH ROW EXECUTE FUNCTION core.chapters_enforce_grouping_shape();


--
-- Name: chapters chapters_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER chapters_set_updated_at BEFORE UPDATE ON core.chapters FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: grouping_chapter_tags grouping_tags_shape_check; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER grouping_tags_shape_check BEFORE INSERT OR UPDATE OF grouping_chapter_scope_id, parent_branch_scope_id ON core.grouping_chapter_tags FOR EACH ROW EXECUTE FUNCTION core.grouping_tags_check_shape();


--
-- Name: houses houses_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER houses_set_updated_at BEFORE UPDATE ON core.houses FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: member_accounts member_accounts_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER member_accounts_set_updated_at BEFORE UPDATE ON core.member_accounts FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: members members_deceased_cascade; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER members_deceased_cascade AFTER UPDATE OF member_status ON core.members FOR EACH ROW EXECUTE FUNCTION core.members_cascade_deceased();


--
-- Name: members members_generate_member_code; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER members_generate_member_code BEFORE INSERT ON core.members FOR EACH ROW EXECUTE FUNCTION core.members_generate_member_code();


--
-- Name: members members_scope_types_check; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER members_scope_types_check BEFORE INSERT OR UPDATE OF batch_scope_id, house_scope_id, network_scope_id ON core.members FOR EACH ROW EXECUTE FUNCTION core.members_check_scope_types();


--
-- Name: members members_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER members_set_updated_at BEFORE UPDATE ON core.members FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: memberships memberships_passive_shape_check; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER memberships_passive_shape_check BEFORE INSERT OR UPDATE OF membership_status ON core.memberships FOR EACH ROW EXECUTE FUNCTION core.memberships_check_passive_shape();


--
-- Name: memberships memberships_scope_shape_check; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER memberships_scope_shape_check BEFORE INSERT OR UPDATE OF scope_id ON core.memberships FOR EACH ROW EXECUTE FUNCTION core.memberships_check_scope_shape();


--
-- Name: memberships memberships_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER memberships_set_updated_at BEFORE UPDATE ON core.memberships FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: networks networks_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER networks_set_updated_at BEFORE UPDATE ON core.networks FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: position_assignments position_assignments_president_prompt; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER position_assignments_president_prompt AFTER INSERT ON core.position_assignments FOR EACH ROW EXECUTE FUNCTION core.position_president_prompt();


--
-- Name: position_assignments position_assignments_scope_type_check; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER position_assignments_scope_type_check BEFORE INSERT OR UPDATE OF position_catalog_id, scope_id ON core.position_assignments FOR EACH ROW EXECUTE FUNCTION core.position_assignments_check_scope_type();


--
-- Name: position_catalog position_catalog_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER position_catalog_set_updated_at BEFORE UPDATE ON core.position_catalog FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON core.profiles FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: registration_status registration_status_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER registration_status_set_updated_at BEFORE UPDATE ON core.registration_status FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: registration_status registration_status_transferred_terminals_frozen; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER registration_status_transferred_terminals_frozen BEFORE UPDATE OF marked_paid_at, waived_at, paid_on_behalf_at, marked_paid_by, waived_by, paid_on_behalf_by ON core.registration_status FOR EACH ROW EXECUTE FUNCTION core.registration_status_transferred_terminals_frozen_fn();


--
-- Name: role_assignments role_assignments_audit; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER role_assignments_audit AFTER INSERT OR UPDATE ON core.role_assignments FOR EACH ROW EXECUTE FUNCTION core.role_assignments_audit_trigger();


--
-- Name: role_assignments role_assignments_last_admin_protection; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER role_assignments_last_admin_protection BEFORE UPDATE ON core.role_assignments FOR EACH ROW EXECUTE FUNCTION core.enforce_last_admin_protection();


--
-- Name: role_assignments role_assignments_six_holder_cap; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER role_assignments_six_holder_cap BEFORE INSERT OR UPDATE ON core.role_assignments FOR EACH ROW EXECUTE FUNCTION core.enforce_six_holder_cap();


--
-- Name: role_history role_history_block_delete; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER role_history_block_delete BEFORE DELETE ON core.role_history FOR EACH ROW EXECUTE FUNCTION core.role_history_block_mutation();


--
-- Name: role_history role_history_block_update; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER role_history_block_update BEFORE UPDATE ON core.role_history FOR EACH ROW EXECUTE FUNCTION core.role_history_block_mutation();


--
-- Name: scope_capabilities scope_capabilities_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER scope_capabilities_set_updated_at BEFORE UPDATE ON core.scope_capabilities FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: scopes scopes_currency_lock; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER scopes_currency_lock BEFORE UPDATE OF currency_code ON core.scopes FOR EACH ROW WHEN ((new.currency_code IS DISTINCT FROM old.currency_code)) EXECUTE FUNCTION core.enforce_currency_immutable_once_used();


--
-- Name: scopes scopes_set_updated_at; Type: TRIGGER; Schema: core; Owner: -
--

CREATE TRIGGER scopes_set_updated_at BEFORE UPDATE ON core.scopes FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: announcements announcements_set_updated_at; Type: TRIGGER; Schema: exco; Owner: -
--

CREATE TRIGGER announcements_set_updated_at BEFORE UPDATE ON exco.announcements FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: event_rsvps event_rsvps_set_updated_at; Type: TRIGGER; Schema: exco; Owner: -
--

CREATE TRIGGER event_rsvps_set_updated_at BEFORE UPDATE ON exco.event_rsvps FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: events events_block_archive_with_paid_contribution; Type: TRIGGER; Schema: exco; Owner: -
--

CREATE TRIGGER events_block_archive_with_paid_contribution BEFORE UPDATE OF status ON exco.events FOR EACH ROW WHEN (((new.status = 'archived'::exco.event_status) AND (old.status IS DISTINCT FROM new.status))) EXECUTE FUNCTION exco.events_block_archive_with_paid_contribution();


--
-- Name: events events_set_updated_at; Type: TRIGGER; Schema: exco; Owner: -
--

CREATE TRIGGER events_set_updated_at BEFORE UPDATE ON exco.events FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: charge_targets charge_targets_enforce_shape; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER charge_targets_enforce_shape BEFORE INSERT OR UPDATE ON finance.charge_targets FOR EACH ROW EXECUTE FUNCTION finance.charge_targets_enforce_shape();


--
-- Name: expenses expenses_block_delete; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER expenses_block_delete BEFORE DELETE ON finance.expenses FOR EACH ROW EXECUTE FUNCTION finance.expenses_block_delete();


--
-- Name: expenses expenses_freeze; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER expenses_freeze BEFORE UPDATE ON finance.expenses FOR EACH ROW EXECUTE FUNCTION finance.expenses_enforce_freeze();


--
-- Name: expenses expenses_write_ledger_on_approve; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER expenses_write_ledger_on_approve AFTER UPDATE ON finance.expenses FOR EACH ROW WHEN (((old.status = 'pending_approval'::finance.expense_status) AND (new.status = 'approved'::finance.expense_status))) EXECUTE FUNCTION finance.expenses_write_ledger_on_approve();


--
-- Name: expenses expenses_write_ledger_on_insert; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER expenses_write_ledger_on_insert AFTER INSERT ON finance.expenses FOR EACH ROW EXECUTE FUNCTION finance.expenses_write_ledger_on_insert();


--
-- Name: groups groups_enforce_mainstream_scope; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER groups_enforce_mainstream_scope BEFORE INSERT OR UPDATE OF scope_id ON finance.groups FOR EACH ROW EXECUTE FUNCTION finance.groups_enforce_mainstream_scope();


--
-- Name: ledger_entries ledger_entries_block_delete; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER ledger_entries_block_delete BEFORE DELETE ON finance.ledger_entries FOR EACH ROW EXECUTE FUNCTION finance.ledger_entries_block_mutation();


--
-- Name: ledger_entries ledger_entries_block_update; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER ledger_entries_block_update BEFORE UPDATE ON finance.ledger_entries FOR EACH ROW EXECUTE FUNCTION finance.ledger_entries_block_mutation();


--
-- Name: obligations obligations_block_delete; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER obligations_block_delete BEFORE DELETE ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.obligations_block_delete();


--
-- Name: obligations obligations_freeze; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER obligations_freeze BEFORE UPDATE ON finance.obligations FOR EACH ROW EXECUTE FUNCTION finance.obligations_enforce_freeze();


--
-- Name: payments payments_block_delete; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER payments_block_delete BEFORE DELETE ON finance.payments FOR EACH ROW EXECUTE FUNCTION finance.payments_block_mutation();


--
-- Name: payments payments_block_update; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER payments_block_update BEFORE UPDATE ON finance.payments FOR EACH ROW EXECUTE FUNCTION finance.payments_block_mutation();


--
-- Name: payments payments_generate_receipt; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER payments_generate_receipt AFTER INSERT ON finance.payments FOR EACH ROW EXECUTE FUNCTION finance.generate_receipt_for_payment();


--
-- Name: payments payments_inherit_group_id; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER payments_inherit_group_id BEFORE INSERT ON finance.payments FOR EACH ROW EXECUTE FUNCTION finance.payments_inherit_group_id();


--
-- Name: payments payments_recompute_obligation_status; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER payments_recompute_obligation_status AFTER INSERT ON finance.payments FOR EACH ROW EXECUTE FUNCTION finance.obligations_recompute_status_from_payments();


--
-- Name: payments payments_write_ledger; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER payments_write_ledger AFTER INSERT ON finance.payments FOR EACH ROW EXECUTE FUNCTION finance.payments_write_ledger();


--
-- Name: treasury_balances treasury_balances_ledger_path_only_delete; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER treasury_balances_ledger_path_only_delete BEFORE DELETE ON finance.treasury_balances FOR EACH ROW EXECUTE FUNCTION finance.treasury_balances_enforce_ledger_path();


--
-- Name: treasury_balances treasury_balances_ledger_path_only_update; Type: TRIGGER; Schema: finance; Owner: -
--

CREATE TRIGGER treasury_balances_ledger_path_only_update BEFORE UPDATE ON finance.treasury_balances FOR EACH ROW EXECUTE FUNCTION finance.treasury_balances_enforce_ledger_path();


--
-- Name: notification_deliveries notification_deliveries_set_updated_at; Type: TRIGGER; Schema: notifications; Owner: -
--

CREATE TRIGGER notification_deliveries_set_updated_at BEFORE UPDATE ON notifications.notification_deliveries FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();


--
-- Name: audit_entries audit_entries_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_entries
    ADD CONSTRAINT audit_entries_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: audit_entries audit_entries_scope_id_fkey; Type: FK CONSTRAINT; Schema: audit; Owner: -
--

ALTER TABLE ONLY audit.audit_entries
    ADD CONSTRAINT audit_entries_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE SET NULL;


--
-- Name: agm_registrations agm_registrations_settled_by_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.agm_registrations
    ADD CONSTRAINT agm_registrations_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: article_categories_map article_categories_map_article_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.article_categories_map
    ADD CONSTRAINT article_categories_map_article_id_fkey FOREIGN KEY (article_id) REFERENCES cms.articles(id) ON DELETE CASCADE;


--
-- Name: article_categories_map article_categories_map_category_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.article_categories_map
    ADD CONSTRAINT article_categories_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES cms.article_categories(id) ON DELETE CASCADE;


--
-- Name: gallery_album_categories_map gallery_album_categories_map_album_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_album_categories_map
    ADD CONSTRAINT gallery_album_categories_map_album_id_fkey FOREIGN KEY (album_id) REFERENCES cms.gallery_albums(id) ON DELETE CASCADE;


--
-- Name: gallery_album_categories_map gallery_album_categories_map_category_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_album_categories_map
    ADD CONSTRAINT gallery_album_categories_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES cms.gallery_album_categories(id) ON DELETE CASCADE;


--
-- Name: gallery_albums gallery_albums_linked_event_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_albums
    ADD CONSTRAINT gallery_albums_linked_event_id_fkey FOREIGN KEY (linked_event_id) REFERENCES cms.site_events(id) ON DELETE SET NULL;


--
-- Name: gallery_media gallery_media_album_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.gallery_media
    ADD CONSTRAINT gallery_media_album_id_fkey FOREIGN KEY (album_id) REFERENCES cms.gallery_albums(id) ON DELETE CASCADE;


--
-- Name: mainstream_leaders mainstream_leaders_sector_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.mainstream_leaders
    ADD CONSTRAINT mainstream_leaders_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES cms.mainstream_sectors(id) ON DELETE CASCADE;


--
-- Name: organs organs_sector_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.organs
    ADD CONSTRAINT organs_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES cms.organ_sectors(id) ON DELETE RESTRICT;


--
-- Name: project_categories_map project_categories_map_category_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.project_categories_map
    ADD CONSTRAINT project_categories_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES cms.project_categories(id) ON DELETE CASCADE;


--
-- Name: project_categories_map project_categories_map_project_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.project_categories_map
    ADD CONSTRAINT project_categories_map_project_id_fkey FOREIGN KEY (project_id) REFERENCES cms.projects(id) ON DELETE CASCADE;


--
-- Name: site_event_categories_map site_event_categories_map_category_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.site_event_categories_map
    ADD CONSTRAINT site_event_categories_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES cms.site_event_categories(id) ON DELETE CASCADE;


--
-- Name: site_event_categories_map site_event_categories_map_event_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.site_event_categories_map
    ADD CONSTRAINT site_event_categories_map_event_id_fkey FOREIGN KEY (event_id) REFERENCES cms.site_events(id) ON DELETE CASCADE;


--
-- Name: songs songs_group_id_fkey; Type: FK CONSTRAINT; Schema: cms; Owner: -
--

ALTER TABLE ONLY cms.songs
    ADD CONSTRAINT songs_group_id_fkey FOREIGN KEY (group_id) REFERENCES cms.song_groups(id) ON DELETE RESTRICT;


--
-- Name: batches batches_created_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.batches
    ADD CONSTRAINT batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: batches batches_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.batches
    ADD CONSTRAINT batches_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: branches branches_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.branches
    ADD CONSTRAINT branches_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: chapters chapters_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.chapters
    ADD CONSTRAINT chapters_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: grouping_chapter_tags grouping_chapter_tags_assigned_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.grouping_chapter_tags
    ADD CONSTRAINT grouping_chapter_tags_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: grouping_chapter_tags grouping_chapter_tags_grouping_chapter_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.grouping_chapter_tags
    ADD CONSTRAINT grouping_chapter_tags_grouping_chapter_scope_id_fkey FOREIGN KEY (grouping_chapter_scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: grouping_chapter_tags grouping_chapter_tags_member_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.grouping_chapter_tags
    ADD CONSTRAINT grouping_chapter_tags_member_id_fkey FOREIGN KEY (member_id) REFERENCES core.members(id) ON DELETE CASCADE;


--
-- Name: grouping_chapter_tags grouping_chapter_tags_parent_branch_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.grouping_chapter_tags
    ADD CONSTRAINT grouping_chapter_tags_parent_branch_scope_id_fkey FOREIGN KEY (parent_branch_scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: grouping_chapter_tags grouping_chapter_tags_removed_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.grouping_chapter_tags
    ADD CONSTRAINT grouping_chapter_tags_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: houses houses_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.houses
    ADD CONSTRAINT houses_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: import_batches import_batches_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.import_batches
    ADD CONSTRAINT import_batches_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: import_batches import_batches_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.import_batches
    ADD CONSTRAINT import_batches_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: import_batches import_batches_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.import_batches
    ADD CONSTRAINT import_batches_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: import_batches import_batches_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.import_batches
    ADD CONSTRAINT import_batches_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: import_rows import_rows_created_member_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.import_rows
    ADD CONSTRAINT import_rows_created_member_id_fkey FOREIGN KEY (created_member_id) REFERENCES core.members(id) ON DELETE SET NULL;


--
-- Name: import_rows import_rows_import_batch_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.import_rows
    ADD CONSTRAINT import_rows_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES core.import_batches(id) ON DELETE CASCADE;


--
-- Name: member_accounts member_accounts_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.member_accounts
    ADD CONSTRAINT member_accounts_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: member_accounts member_accounts_member_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.member_accounts
    ADD CONSTRAINT member_accounts_member_id_fkey FOREIGN KEY (member_id) REFERENCES core.members(id) ON DELETE CASCADE;


--
-- Name: members members_batch_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.members
    ADD CONSTRAINT members_batch_scope_id_fkey FOREIGN KEY (batch_scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: members members_created_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.members
    ADD CONSTRAINT members_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: members members_house_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.members
    ADD CONSTRAINT members_house_scope_id_fkey FOREIGN KEY (house_scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: members members_sector_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.members
    ADD CONSTRAINT members_sector_scope_id_fkey FOREIGN KEY (network_scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: membership_transfers membership_transfers_approved_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.membership_transfers
    ADD CONSTRAINT membership_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: membership_transfers membership_transfers_destination_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.membership_transfers
    ADD CONSTRAINT membership_transfers_destination_scope_id_fkey FOREIGN KEY (destination_scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: membership_transfers membership_transfers_member_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.membership_transfers
    ADD CONSTRAINT membership_transfers_member_id_fkey FOREIGN KEY (member_id) REFERENCES core.members(id) ON DELETE CASCADE;


--
-- Name: membership_transfers membership_transfers_rejected_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.membership_transfers
    ADD CONSTRAINT membership_transfers_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: membership_transfers membership_transfers_requested_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.membership_transfers
    ADD CONSTRAINT membership_transfers_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: membership_transfers membership_transfers_source_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.membership_transfers
    ADD CONSTRAINT membership_transfers_source_scope_id_fkey FOREIGN KEY (source_scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: memberships memberships_approved_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.memberships
    ADD CONSTRAINT memberships_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: memberships memberships_member_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.memberships
    ADD CONSTRAINT memberships_member_id_fkey FOREIGN KEY (member_id) REFERENCES core.members(id) ON DELETE CASCADE;


--
-- Name: memberships memberships_rejected_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.memberships
    ADD CONSTRAINT memberships_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: memberships memberships_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.memberships
    ADD CONSTRAINT memberships_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: networks networks_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.networks
    ADD CONSTRAINT networks_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: position_assignments position_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.position_assignments
    ADD CONSTRAINT position_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: position_assignments position_assignments_member_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.position_assignments
    ADD CONSTRAINT position_assignments_member_id_fkey FOREIGN KEY (member_id) REFERENCES core.members(id) ON DELETE CASCADE;


--
-- Name: position_assignments position_assignments_position_catalog_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.position_assignments
    ADD CONSTRAINT position_assignments_position_catalog_id_fkey FOREIGN KEY (position_catalog_id) REFERENCES core.position_catalog(id) ON DELETE RESTRICT;


--
-- Name: position_assignments position_assignments_removed_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.position_assignments
    ADD CONSTRAINT position_assignments_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: position_assignments position_assignments_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.position_assignments
    ADD CONSTRAINT position_assignments_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: registration_status registration_status_marked_paid_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.registration_status
    ADD CONSTRAINT registration_status_marked_paid_by_fkey FOREIGN KEY (marked_paid_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: registration_status registration_status_membership_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.registration_status
    ADD CONSTRAINT registration_status_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES core.memberships(id) ON DELETE CASCADE;


--
-- Name: registration_status registration_status_paid_on_behalf_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.registration_status
    ADD CONSTRAINT registration_status_paid_on_behalf_by_fkey FOREIGN KEY (paid_on_behalf_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: registration_status registration_status_waived_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.registration_status
    ADD CONSTRAINT registration_status_waived_by_fkey FOREIGN KEY (waived_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: role_assignments role_assignments_granted_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_assignments
    ADD CONSTRAINT role_assignments_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: role_assignments role_assignments_revoked_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_assignments
    ADD CONSTRAINT role_assignments_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: role_assignments role_assignments_role_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_assignments
    ADD CONSTRAINT role_assignments_role_id_fkey FOREIGN KEY (role_id) REFERENCES core.roles(id) ON DELETE RESTRICT;


--
-- Name: role_assignments role_assignments_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_assignments
    ADD CONSTRAINT role_assignments_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: role_assignments role_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_assignments
    ADD CONSTRAINT role_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: role_history role_history_audit_entry_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_history
    ADD CONSTRAINT role_history_audit_entry_id_fkey FOREIGN KEY (audit_entry_id) REFERENCES audit.audit_entries(id) ON DELETE SET NULL;


--
-- Name: role_history role_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_history
    ADD CONSTRAINT role_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: role_history role_history_role_assignment_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_history
    ADD CONSTRAINT role_history_role_assignment_id_fkey FOREIGN KEY (role_assignment_id) REFERENCES core.role_assignments(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES core.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES core.roles(id) ON DELETE CASCADE;


--
-- Name: scope_capabilities scope_capabilities_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.scope_capabilities
    ADD CONSTRAINT scope_capabilities_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: scopes scopes_created_by_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.scopes
    ADD CONSTRAINT scopes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: scopes scopes_parent_scope_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.scopes
    ADD CONSTRAINT scopes_parent_scope_id_fkey FOREIGN KEY (parent_scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: announcements announcements_owner_scope_id_fkey; Type: FK CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.announcements
    ADD CONSTRAINT announcements_owner_scope_id_fkey FOREIGN KEY (owner_scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: announcements announcements_updated_by_fkey; Type: FK CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.announcements
    ADD CONSTRAINT announcements_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: event_program_items event_program_items_event_id_fkey; Type: FK CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.event_program_items
    ADD CONSTRAINT event_program_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES exco.events(id) ON DELETE CASCADE;


--
-- Name: event_rsvps event_rsvps_event_id_fkey; Type: FK CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.event_rsvps
    ADD CONSTRAINT event_rsvps_event_id_fkey FOREIGN KEY (event_id) REFERENCES exco.events(id) ON DELETE CASCADE;


--
-- Name: event_rsvps event_rsvps_member_id_fkey; Type: FK CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.event_rsvps
    ADD CONSTRAINT event_rsvps_member_id_fkey FOREIGN KEY (member_id) REFERENCES core.members(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: events events_owner_scope_id_fkey; Type: FK CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.events
    ADD CONSTRAINT events_owner_scope_id_fkey FOREIGN KEY (owner_scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: events events_updated_by_fkey; Type: FK CONSTRAINT; Schema: exco; Owner: -
--

ALTER TABLE ONLY exco.events
    ADD CONSTRAINT events_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: charge_amount_versions charge_amount_versions_charge_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_amount_versions
    ADD CONSTRAINT charge_amount_versions_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES finance.charges(id) ON DELETE CASCADE;


--
-- Name: charge_amount_versions charge_amount_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_amount_versions
    ADD CONSTRAINT charge_amount_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: charge_amount_versions charge_amount_versions_target_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_amount_versions
    ADD CONSTRAINT charge_amount_versions_target_scope_id_fkey FOREIGN KEY (target_scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: charge_targets charge_targets_charge_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_targets
    ADD CONSTRAINT charge_targets_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES finance.charges(id) ON DELETE CASCADE;


--
-- Name: charge_targets charge_targets_target_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charge_targets
    ADD CONSTRAINT charge_targets_target_scope_id_fkey FOREIGN KEY (target_scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: charges charges_category_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charges
    ADD CONSTRAINT charges_category_id_fkey FOREIGN KEY (category_id) REFERENCES finance.charge_categories(id) ON DELETE SET NULL;


--
-- Name: charges charges_created_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charges
    ADD CONSTRAINT charges_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: charges charges_event_fk; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charges
    ADD CONSTRAINT charges_event_fk FOREIGN KEY (event_id) REFERENCES exco.events(id) ON DELETE RESTRICT;


--
-- Name: charges charges_group_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charges
    ADD CONSTRAINT charges_group_id_fkey FOREIGN KEY (group_id) REFERENCES finance.groups(id) ON DELETE SET NULL;


--
-- Name: charges charges_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.charges
    ADD CONSTRAINT charges_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: contribution_extensions contribution_extensions_charge_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.contribution_extensions
    ADD CONSTRAINT contribution_extensions_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES finance.charges(id) ON DELETE CASCADE;


--
-- Name: contribution_extensions contribution_extensions_extended_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.contribution_extensions
    ADD CONSTRAINT contribution_extensions_extended_by_fkey FOREIGN KEY (extended_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: exceptions exceptions_charge_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.exceptions
    ADD CONSTRAINT exceptions_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES finance.charges(id) ON DELETE CASCADE;


--
-- Name: exceptions exceptions_created_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.exceptions
    ADD CONSTRAINT exceptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: exceptions exceptions_member_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.exceptions
    ADD CONSTRAINT exceptions_member_id_fkey FOREIGN KEY (member_id) REFERENCES core.members(id) ON DELETE CASCADE;


--
-- Name: exchange_rates exchange_rates_set_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.exchange_rates
    ADD CONSTRAINT exchange_rates_set_by_fkey FOREIGN KEY (set_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: expense_settings expense_settings_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expense_settings
    ADD CONSTRAINT expense_settings_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE CASCADE;


--
-- Name: expense_settings expense_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expense_settings
    ADD CONSTRAINT expense_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_approved_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expenses
    ADD CONSTRAINT expenses_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_category_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expenses
    ADD CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES finance.expense_categories(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_group_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expenses
    ADD CONSTRAINT expenses_group_id_fkey FOREIGN KEY (group_id) REFERENCES finance.groups(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_recorded_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expenses
    ADD CONSTRAINT expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_reverses_expense_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expenses
    ADD CONSTRAINT expenses_reverses_expense_id_fkey FOREIGN KEY (reverses_expense_id) REFERENCES finance.expenses(id) ON DELETE RESTRICT;


--
-- Name: expenses expenses_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.expenses
    ADD CONSTRAINT expenses_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: groups groups_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.groups
    ADD CONSTRAINT groups_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_expense_fk; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.ledger_entries
    ADD CONSTRAINT ledger_entries_expense_fk FOREIGN KEY (expense_id) REFERENCES finance.expenses(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_payment_fk; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.ledger_entries
    ADD CONSTRAINT ledger_entries_payment_fk FOREIGN KEY (payment_id) REFERENCES finance.payments(id) ON DELETE RESTRICT;


--
-- Name: ledger_entries ledger_entries_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.ledger_entries
    ADD CONSTRAINT ledger_entries_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: obligations obligations_charge_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.obligations
    ADD CONSTRAINT obligations_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES finance.charges(id) ON DELETE RESTRICT;


--
-- Name: obligations obligations_exception_applied_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.obligations
    ADD CONSTRAINT obligations_exception_applied_fkey FOREIGN KEY (exception_applied) REFERENCES finance.exceptions(id) ON DELETE SET NULL;


--
-- Name: obligations obligations_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.obligations
    ADD CONSTRAINT obligations_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: payment_intents payment_intents_charge_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_intents
    ADD CONSTRAINT payment_intents_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES finance.charges(id) ON DELETE RESTRICT;


--
-- Name: payment_intents payment_intents_created_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_intents
    ADD CONSTRAINT payment_intents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: payment_intents payment_intents_obligation_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_intents
    ADD CONSTRAINT payment_intents_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES finance.obligations(id) ON DELETE RESTRICT;


--
-- Name: payment_intents payment_intents_payer_member_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_intents
    ADD CONSTRAINT payment_intents_payer_member_id_fkey FOREIGN KEY (payer_member_id) REFERENCES core.members(id) ON DELETE SET NULL;


--
-- Name: payment_intents payment_intents_resulting_payment_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_intents
    ADD CONSTRAINT payment_intents_resulting_payment_id_fkey FOREIGN KEY (resulting_payment_id) REFERENCES finance.payments(id) ON DELETE RESTRICT;


--
-- Name: payment_intents payment_intents_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payment_intents
    ADD CONSTRAINT payment_intents_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: payments payments_charge_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payments
    ADD CONSTRAINT payments_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES finance.charges(id) ON DELETE RESTRICT;


--
-- Name: payments payments_group_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payments
    ADD CONSTRAINT payments_group_id_fkey FOREIGN KEY (group_id) REFERENCES finance.groups(id) ON DELETE SET NULL;


--
-- Name: payments payments_obligation_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payments
    ADD CONSTRAINT payments_obligation_id_fkey FOREIGN KEY (obligation_id) REFERENCES finance.obligations(id) ON DELETE RESTRICT;


--
-- Name: payments payments_payer_member_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payments
    ADD CONSTRAINT payments_payer_member_id_fkey FOREIGN KEY (payer_member_id) REFERENCES core.members(id) ON DELETE SET NULL;


--
-- Name: payments payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payments
    ADD CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: payments payments_reverses_payment_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payments
    ADD CONSTRAINT payments_reverses_payment_id_fkey FOREIGN KEY (reverses_payment_id) REFERENCES finance.payments(id) ON DELETE RESTRICT;


--
-- Name: payments payments_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.payments
    ADD CONSTRAINT payments_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: receipt_verifications receipt_verifications_payment_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.receipt_verifications
    ADD CONSTRAINT receipt_verifications_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES finance.payments(id) ON DELETE RESTRICT;


--
-- Name: reconciliations reconciliations_payment_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.reconciliations
    ADD CONSTRAINT reconciliations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES finance.payments(id) ON DELETE CASCADE;


--
-- Name: reconciliations reconciliations_reconciled_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.reconciliations
    ADD CONSTRAINT reconciliations_reconciled_by_fkey FOREIGN KEY (reconciled_by) REFERENCES auth.users(id) ON DELETE RESTRICT;


--
-- Name: tickets tickets_buyer_member_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.tickets
    ADD CONSTRAINT tickets_buyer_member_id_fkey FOREIGN KEY (buyer_member_id) REFERENCES core.members(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_charge_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.tickets
    ADD CONSTRAINT tickets_charge_id_fkey FOREIGN KEY (charge_id) REFERENCES finance.charges(id) ON DELETE RESTRICT;


--
-- Name: tickets tickets_payment_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.tickets
    ADD CONSTRAINT tickets_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES finance.payments(id) ON DELETE RESTRICT;


--
-- Name: treasury_balances treasury_balances_scope_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: -
--

ALTER TABLE ONLY finance.treasury_balances
    ADD CONSTRAINT treasury_balances_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE RESTRICT;


--
-- Name: notification_deliveries notification_deliveries_event_id_fkey; Type: FK CONSTRAINT; Schema: notifications; Owner: -
--

ALTER TABLE ONLY notifications.notification_deliveries
    ADD CONSTRAINT notification_deliveries_event_id_fkey FOREIGN KEY (event_id) REFERENCES notifications.notification_events(id) ON DELETE CASCADE;


--
-- Name: notification_events notification_events_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: notifications; Owner: -
--

ALTER TABLE ONLY notifications.notification_events
    ADD CONSTRAINT notification_events_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: notification_events notification_events_scope_id_fkey; Type: FK CONSTRAINT; Schema: notifications; Owner: -
--

ALTER TABLE ONLY notifications.notification_events
    ADD CONSTRAINT notification_events_scope_id_fkey FOREIGN KEY (scope_id) REFERENCES core.scopes(id) ON DELETE SET NULL;


--
-- Name: audit_entries; Type: ROW SECURITY; Schema: audit; Owner: -
--

ALTER TABLE audit.audit_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_entries audit_entries_insert_via_helper_only; Type: POLICY; Schema: audit; Owner: -
--

CREATE POLICY audit_entries_insert_via_helper_only ON audit.audit_entries FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: audit_entries audit_entries_select; Type: POLICY; Schema: audit; Owner: -
--

CREATE POLICY audit_entries_select ON audit.audit_entries FOR SELECT TO authenticated USING (((scope_id IS NOT NULL) AND core.has_permission(auth.uid(), scope_id, 'audit.read'::text)));


--
-- Name: agm_registrations; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.agm_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: agm_registrations agm_registrations_select_finance; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY agm_registrations_select_finance ON cms.agm_registrations FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), core.mainstream_scope_id(), 'treasury.read'::text) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'finance.read'::text)));


--
-- Name: agm_registrations agm_registrations_update_finance; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY agm_registrations_update_finance ON cms.agm_registrations FOR UPDATE TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'finance.write'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'finance.write'::text));


--
-- Name: article_categories; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.article_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: article_categories_map; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.article_categories_map ENABLE ROW LEVEL SECURITY;

--
-- Name: article_categories_map article_categories_map_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY article_categories_map_select_public ON cms.article_categories_map FOR SELECT TO authenticated, anon USING (true);


--
-- Name: article_categories_map article_categories_map_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY article_categories_map_write_editor ON cms.article_categories_map TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: article_categories article_categories_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY article_categories_select_public ON cms.article_categories FOR SELECT TO authenticated, anon USING (true);


--
-- Name: article_categories article_categories_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY article_categories_write_editor ON cms.article_categories TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: articles; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.articles ENABLE ROW LEVEL SECURITY;

--
-- Name: articles articles_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY articles_select_public ON cms.articles FOR SELECT TO authenticated, anon USING (true);


--
-- Name: articles articles_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY articles_write_editor ON cms.articles TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: batch_leaders; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.batch_leaders ENABLE ROW LEVEL SECURITY;

--
-- Name: batch_leaders batch_leaders_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY batch_leaders_select_public ON cms.batch_leaders FOR SELECT TO authenticated, anon USING (true);


--
-- Name: batch_leaders batch_leaders_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY batch_leaders_write_editor ON cms.batch_leaders TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: branch_leaders; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.branch_leaders ENABLE ROW LEVEL SECURITY;

--
-- Name: branch_leaders branch_leaders_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY branch_leaders_select_public ON cms.branch_leaders FOR SELECT TO authenticated, anon USING (true);


--
-- Name: branch_leaders branch_leaders_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY branch_leaders_write_editor ON cms.branch_leaders TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: diaspora_leaders; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.diaspora_leaders ENABLE ROW LEVEL SECURITY;

--
-- Name: diaspora_leaders diaspora_leaders_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY diaspora_leaders_select_public ON cms.diaspora_leaders FOR SELECT TO authenticated, anon USING (true);


--
-- Name: diaspora_leaders diaspora_leaders_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY diaspora_leaders_write_editor ON cms.diaspora_leaders TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: gallery_album_categories; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.gallery_album_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: gallery_album_categories_map; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.gallery_album_categories_map ENABLE ROW LEVEL SECURITY;

--
-- Name: gallery_album_categories_map gallery_album_categories_map_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY gallery_album_categories_map_select_public ON cms.gallery_album_categories_map FOR SELECT TO authenticated, anon USING (true);


--
-- Name: gallery_album_categories_map gallery_album_categories_map_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY gallery_album_categories_map_write_editor ON cms.gallery_album_categories_map TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: gallery_album_categories gallery_album_categories_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY gallery_album_categories_select_public ON cms.gallery_album_categories FOR SELECT TO authenticated, anon USING (true);


--
-- Name: gallery_album_categories gallery_album_categories_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY gallery_album_categories_write_editor ON cms.gallery_album_categories TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: gallery_albums; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.gallery_albums ENABLE ROW LEVEL SECURITY;

--
-- Name: gallery_albums gallery_albums_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY gallery_albums_select_public ON cms.gallery_albums FOR SELECT TO authenticated, anon USING (true);


--
-- Name: gallery_albums gallery_albums_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY gallery_albums_write_editor ON cms.gallery_albums TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: gallery_media; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.gallery_media ENABLE ROW LEVEL SECURITY;

--
-- Name: gallery_media gallery_media_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY gallery_media_select_public ON cms.gallery_media FOR SELECT TO authenticated, anon USING (true);


--
-- Name: gallery_media gallery_media_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY gallery_media_write_editor ON cms.gallery_media TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: mainstream_leaders; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.mainstream_leaders ENABLE ROW LEVEL SECURITY;

--
-- Name: mainstream_leaders mainstream_leaders_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY mainstream_leaders_select_public ON cms.mainstream_leaders FOR SELECT TO authenticated, anon USING (true);


--
-- Name: mainstream_leaders mainstream_leaders_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY mainstream_leaders_write_editor ON cms.mainstream_leaders TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: mainstream_sectors; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.mainstream_sectors ENABLE ROW LEVEL SECURITY;

--
-- Name: mainstream_sectors mainstream_sectors_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY mainstream_sectors_select_public ON cms.mainstream_sectors FOR SELECT TO authenticated, anon USING (true);


--
-- Name: mainstream_sectors mainstream_sectors_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY mainstream_sectors_write_editor ON cms.mainstream_sectors TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: organ_sectors; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.organ_sectors ENABLE ROW LEVEL SECURITY;

--
-- Name: organ_sectors organ_sectors_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY organ_sectors_select_public ON cms.organ_sectors FOR SELECT TO authenticated, anon USING (true);


--
-- Name: organ_sectors organ_sectors_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY organ_sectors_write_editor ON cms.organ_sectors TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: organs; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.organs ENABLE ROW LEVEL SECURITY;

--
-- Name: organs organs_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY organs_select_public ON cms.organs FOR SELECT TO authenticated, anon USING (true);


--
-- Name: organs organs_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY organs_write_editor ON cms.organs TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: project_categories; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.project_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: project_categories_map; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.project_categories_map ENABLE ROW LEVEL SECURITY;

--
-- Name: project_categories_map project_categories_map_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY project_categories_map_select_public ON cms.project_categories_map FOR SELECT TO authenticated, anon USING (true);


--
-- Name: project_categories_map project_categories_map_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY project_categories_map_write_editor ON cms.project_categories_map TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: project_categories project_categories_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY project_categories_select_public ON cms.project_categories FOR SELECT TO authenticated, anon USING (true);


--
-- Name: project_categories project_categories_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY project_categories_write_editor ON cms.project_categories TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: projects; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY projects_select_public ON cms.projects FOR SELECT TO authenticated, anon USING (true);


--
-- Name: projects projects_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY projects_write_editor ON cms.projects TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: site_event_categories; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.site_event_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: site_event_categories_map; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.site_event_categories_map ENABLE ROW LEVEL SECURITY;

--
-- Name: site_event_categories_map site_event_categories_map_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY site_event_categories_map_select_public ON cms.site_event_categories_map FOR SELECT TO authenticated, anon USING (true);


--
-- Name: site_event_categories_map site_event_categories_map_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY site_event_categories_map_write_editor ON cms.site_event_categories_map TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: site_event_categories site_event_categories_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY site_event_categories_select_public ON cms.site_event_categories FOR SELECT TO authenticated, anon USING (true);


--
-- Name: site_event_categories site_event_categories_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY site_event_categories_write_editor ON cms.site_event_categories TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: site_events; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.site_events ENABLE ROW LEVEL SECURITY;

--
-- Name: site_events site_events_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY site_events_select_public ON cms.site_events FOR SELECT TO authenticated, anon USING (true);


--
-- Name: site_events site_events_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY site_events_write_editor ON cms.site_events TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: song_groups; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.song_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: song_groups song_groups_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY song_groups_select_public ON cms.song_groups FOR SELECT TO authenticated, anon USING (true);


--
-- Name: song_groups song_groups_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY song_groups_write_editor ON cms.song_groups TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: songs; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.songs ENABLE ROW LEVEL SECURITY;

--
-- Name: songs songs_select_public; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY songs_select_public ON cms.songs FOR SELECT TO authenticated, anon USING (true);


--
-- Name: songs songs_write_editor; Type: POLICY; Schema: cms; Owner: -
--

CREATE POLICY songs_write_editor ON cms.songs TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'::text));


--
-- Name: submission_throttle; Type: ROW SECURITY; Schema: cms; Owner: -
--

ALTER TABLE cms.submission_throttle ENABLE ROW LEVEL SECURITY;

--
-- Name: batches; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.batches ENABLE ROW LEVEL SECURITY;

--
-- Name: batches batches_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY batches_select_authenticated ON core.batches FOR SELECT TO authenticated USING (true);


--
-- Name: branches; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.branches ENABLE ROW LEVEL SECURITY;

--
-- Name: branches branches_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY branches_select_authenticated ON core.branches FOR SELECT TO authenticated USING (true);


--
-- Name: chapters; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: chapters chapters_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY chapters_select_authenticated ON core.chapters FOR SELECT TO authenticated USING (true);


--
-- Name: grouping_chapter_tags; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.grouping_chapter_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: grouping_chapter_tags grouping_tags_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY grouping_tags_insert ON core.grouping_chapter_tags FOR INSERT TO authenticated WITH CHECK (core.has_permission(auth.uid(), parent_branch_scope_id, 'membership.approve'::text));


--
-- Name: grouping_chapter_tags grouping_tags_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY grouping_tags_select ON core.grouping_chapter_tags FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), parent_branch_scope_id, 'member.read'::text) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read'::text) OR core.member_owned_by(member_id, auth.uid())));


--
-- Name: grouping_chapter_tags grouping_tags_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY grouping_tags_update ON core.grouping_chapter_tags FOR UPDATE TO authenticated USING (core.has_permission(auth.uid(), parent_branch_scope_id, 'membership.approve'::text)) WITH CHECK (core.has_permission(auth.uid(), parent_branch_scope_id, 'membership.approve'::text));


--
-- Name: houses; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.houses ENABLE ROW LEVEL SECURITY;

--
-- Name: houses houses_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY houses_select_authenticated ON core.houses FOR SELECT TO authenticated USING (true);


--
-- Name: import_batches; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.import_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: import_batches import_batches_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY import_batches_insert ON core.import_batches FOR INSERT TO authenticated WITH CHECK ((core.has_permission(auth.uid(), scope_id, 'member.import'::text) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.import'::text)));


--
-- Name: import_batches import_batches_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY import_batches_select ON core.import_batches FOR SELECT TO authenticated USING (((uploaded_by = auth.uid()) OR core.has_permission(auth.uid(), scope_id, 'member.import'::text) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.import'::text)));


--
-- Name: import_batches import_batches_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY import_batches_update ON core.import_batches FOR UPDATE TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'member.import'::text) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.import'::text))) WITH CHECK ((core.has_permission(auth.uid(), scope_id, 'member.import'::text) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.import'::text)));


--
-- Name: import_rows; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.import_rows ENABLE ROW LEVEL SECURITY;

--
-- Name: import_rows import_rows_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY import_rows_insert ON core.import_rows FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM core.import_batches b
  WHERE (b.id = import_rows.import_batch_id))));


--
-- Name: import_rows import_rows_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY import_rows_select ON core.import_rows FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM core.import_batches b
  WHERE (b.id = import_rows.import_batch_id))));


--
-- Name: import_rows import_rows_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY import_rows_update ON core.import_rows FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM core.import_batches b
  WHERE (b.id = import_rows.import_batch_id)))) WITH CHECK ((EXISTS ( SELECT 1
   FROM core.import_batches b
  WHERE (b.id = import_rows.import_batch_id))));


--
-- Name: member_accounts; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.member_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: member_accounts member_accounts_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY member_accounts_insert ON core.member_accounts FOR INSERT TO authenticated WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.manage'::text));


--
-- Name: member_accounts member_accounts_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY member_accounts_select ON core.member_accounts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ((core.role_assignments ra
     JOIN core.role_permissions rp ON ((rp.role_id = ra.role_id)))
     JOIN core.permissions p ON ((p.id = rp.permission_id)))
  WHERE ((ra.user_id = auth.uid()) AND (p.key = 'member.import'::text) AND (ra.revoked_at IS NULL) AND (ra.starts_at <= now()) AND ((ra.ends_at IS NULL) OR (ra.ends_at > now()))))));


--
-- Name: POLICY member_accounts_select ON member_accounts; Type: COMMENT; Schema: core; Owner: -
--

COMMENT ON POLICY member_accounts_select ON core.member_accounts IS 'Admin-lens SELECT — any active member.import grant admits reads. Fine-grained scope filtering happens in the Invites page query, not the policy.';


--
-- Name: member_accounts member_accounts_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY member_accounts_update ON core.member_accounts FOR UPDATE TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.manage'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.manage'::text));


--
-- Name: members; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.members ENABLE ROW LEVEL SECURITY;

--
-- Name: members members_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY members_insert ON core.members FOR INSERT TO authenticated WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.create'::text));


--
-- Name: members members_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY members_select ON core.members FOR SELECT TO authenticated USING ((core.member_owned_by(id, auth.uid()) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read'::text) OR core.can_read_member_via_membership(id, auth.uid()) OR core.can_read_member_via_attribute(id, auth.uid()) OR core.can_read_member_via_transfer(id, auth.uid())));


--
-- Name: members members_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY members_update ON core.members FOR UPDATE TO authenticated USING ((core.member_owned_by(id, auth.uid()) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.update'::text))) WITH CHECK ((core.member_owned_by(id, auth.uid()) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.update'::text)));


--
-- Name: membership_transfers; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.membership_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: memberships; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: memberships memberships_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY memberships_insert ON core.memberships FOR INSERT TO authenticated WITH CHECK ((core.has_permission(auth.uid(), scope_id, 'membership.approve'::text) OR core.has_permission(auth.uid(), scope_id, 'membership.transfer'::text) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.create'::text)));


--
-- Name: memberships memberships_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY memberships_select ON core.memberships FOR SELECT TO authenticated USING ((core.membership_owned_by(id, auth.uid()) OR core.has_permission(auth.uid(), scope_id, 'member.read'::text) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read'::text) OR core.can_read_membership_via_member_attribute(member_id, auth.uid())));


--
-- Name: memberships memberships_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY memberships_update ON core.memberships FOR UPDATE TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'membership.approve'::text) OR core.has_permission(auth.uid(), scope_id, 'membership.reject'::text) OR core.has_permission(auth.uid(), scope_id, 'membership.mark_passive'::text) OR core.has_permission(auth.uid(), scope_id, 'membership.transfer'::text))) WITH CHECK ((core.has_permission(auth.uid(), scope_id, 'membership.approve'::text) OR core.has_permission(auth.uid(), scope_id, 'membership.reject'::text) OR core.has_permission(auth.uid(), scope_id, 'membership.mark_passive'::text) OR core.has_permission(auth.uid(), scope_id, 'membership.transfer'::text)));


--
-- Name: networks; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.networks ENABLE ROW LEVEL SECURITY;

--
-- Name: networks networks_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY networks_select_authenticated ON core.networks FOR SELECT TO authenticated USING (true);


--
-- Name: permissions; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: permissions permissions_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY permissions_select_authenticated ON core.permissions FOR SELECT TO authenticated USING (true);


--
-- Name: position_assignments; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.position_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: position_assignments position_assignments_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY position_assignments_insert ON core.position_assignments FOR INSERT TO authenticated WITH CHECK (core.has_permission(auth.uid(), scope_id, 'position.assign'::text));


--
-- Name: position_assignments position_assignments_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY position_assignments_select ON core.position_assignments FOR SELECT TO authenticated USING (true);


--
-- Name: position_assignments position_assignments_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY position_assignments_update ON core.position_assignments FOR UPDATE TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'position.assign'::text) OR core.has_permission(auth.uid(), scope_id, 'position.remove'::text))) WITH CHECK ((core.has_permission(auth.uid(), scope_id, 'position.assign'::text) OR core.has_permission(auth.uid(), scope_id, 'position.remove'::text)));


--
-- Name: position_catalog; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.position_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: position_catalog position_catalog_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY position_catalog_insert ON core.position_catalog FOR INSERT TO authenticated WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'scope.manage_capabilities'::text));


--
-- Name: position_catalog position_catalog_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY position_catalog_select ON core.position_catalog FOR SELECT TO authenticated USING (true);


--
-- Name: position_catalog position_catalog_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY position_catalog_update ON core.position_catalog FOR UPDATE TO authenticated USING (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'scope.manage_capabilities'::text)) WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'scope.manage_capabilities'::text));


--
-- Name: profiles; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY profiles_insert_own ON core.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY profiles_select_own ON core.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY profiles_update_own ON core.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: registration_status registration_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY registration_insert ON core.registration_status FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM core.memberships m
  WHERE ((m.id = registration_status.membership_id) AND core.has_permission(auth.uid(), m.scope_id, 'registration.mark_paid'::text)))));


--
-- Name: registration_status registration_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY registration_select ON core.registration_status FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM core.memberships m
  WHERE (m.id = registration_status.membership_id))));


--
-- Name: registration_status; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.registration_status ENABLE ROW LEVEL SECURITY;

--
-- Name: registration_status registration_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY registration_update ON core.registration_status FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM core.memberships m
  WHERE ((m.id = registration_status.membership_id) AND core.has_permission(auth.uid(), m.scope_id, 'registration.mark_paid'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM core.memberships m
  WHERE ((m.id = registration_status.membership_id) AND core.has_permission(auth.uid(), m.scope_id, 'registration.mark_paid'::text)))));


--
-- Name: role_assignments; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.role_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: role_assignments role_assignments_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY role_assignments_insert ON core.role_assignments FOR INSERT TO authenticated WITH CHECK (core.has_permission(auth.uid(), scope_id, 'role.grant'::text));


--
-- Name: role_assignments role_assignments_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY role_assignments_select ON core.role_assignments FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR core.has_permission(auth.uid(), scope_id, 'role.grant'::text) OR core.has_permission(auth.uid(), scope_id, 'role.revoke'::text) OR core.has_permission(auth.uid(), scope_id, 'audit.read'::text)));


--
-- Name: role_assignments role_assignments_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY role_assignments_update ON core.role_assignments FOR UPDATE TO authenticated USING (core.has_permission(auth.uid(), scope_id, 'role.revoke'::text)) WITH CHECK (core.has_permission(auth.uid(), scope_id, 'role.revoke'::text));


--
-- Name: role_history; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.role_history ENABLE ROW LEVEL SECURITY;

--
-- Name: role_history role_history_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY role_history_select ON core.role_history FOR SELECT TO authenticated USING (core.can_view_role_history(role_assignment_id));


--
-- Name: role_permissions; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions role_permissions_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY role_permissions_select_authenticated ON core.role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: roles; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: roles roles_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY roles_select_authenticated ON core.roles FOR SELECT TO authenticated USING (true);


--
-- Name: scope_capabilities; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.scope_capabilities ENABLE ROW LEVEL SECURITY;

--
-- Name: scope_capabilities scope_capabilities_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY scope_capabilities_select_authenticated ON core.scope_capabilities FOR SELECT TO authenticated USING (true);


--
-- Name: scopes; Type: ROW SECURITY; Schema: core; Owner: -
--

ALTER TABLE core.scopes ENABLE ROW LEVEL SECURITY;

--
-- Name: scopes scopes_select_authenticated; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY scopes_select_authenticated ON core.scopes FOR SELECT TO authenticated USING (true);


--
-- Name: membership_transfers transfers_insert; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY transfers_insert ON core.membership_transfers FOR INSERT TO authenticated WITH CHECK (core.has_permission(auth.uid(), source_scope_id, 'membership.transfer'::text));


--
-- Name: membership_transfers transfers_select; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY transfers_select ON core.membership_transfers FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), source_scope_id, 'membership.transfer'::text) OR core.has_permission(auth.uid(), destination_scope_id, 'membership.transfer'::text) OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read'::text) OR core.member_owned_by(member_id, auth.uid())));


--
-- Name: membership_transfers transfers_update; Type: POLICY; Schema: core; Owner: -
--

CREATE POLICY transfers_update ON core.membership_transfers FOR UPDATE TO authenticated USING ((core.has_permission(auth.uid(), source_scope_id, 'membership.transfer'::text) OR core.has_permission(auth.uid(), destination_scope_id, 'membership.transfer'::text))) WITH CHECK ((core.has_permission(auth.uid(), source_scope_id, 'membership.transfer'::text) OR core.has_permission(auth.uid(), destination_scope_id, 'membership.transfer'::text)));


--
-- Name: announcements; Type: ROW SECURITY; Schema: exco; Owner: -
--

ALTER TABLE exco.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements announcements_admin_can_select; Type: POLICY; Schema: exco; Owner: -
--

CREATE POLICY announcements_admin_can_select ON exco.announcements FOR SELECT TO authenticated USING ((owner_scope_id IN ( SELECT ra.scope_id
   FROM (core.role_assignments ra
     JOIN core.roles r ON ((r.id = ra.role_id)))
  WHERE ((ra.user_id = auth.uid()) AND (ra.scope_id IS NOT NULL) AND core.is_admin_role_key(r.key) AND (ra.starts_at <= now()) AND (ra.revoked_at IS NULL) AND ((ra.ends_at IS NULL) OR (ra.ends_at > now())))
UNION ALL
 SELECT s.id
   FROM core.scopes s
  WHERE ((s.scope_type = 'mainstream'::core.scope_type) AND (EXISTS ( SELECT 1
           FROM (core.role_assignments ra2
             JOIN core.roles r2 ON ((r2.id = ra2.role_id)))
          WHERE ((ra2.user_id = auth.uid()) AND (ra2.scope_id IS NULL) AND (r2.key = 'mainstream_admin'::text) AND (ra2.starts_at <= now()) AND (ra2.revoked_at IS NULL) AND ((ra2.ends_at IS NULL) OR (ra2.ends_at > now())))))))));


--
-- Name: POLICY announcements_admin_can_select ON announcements; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON POLICY announcements_admin_can_select ON exco.announcements IS 'ADR-0041 admin-lens SELECT — siloed on owner_scope_id. Global mainstream_admin grants map to Mainstream (refined 2026-07-04, see 20260704160000).';


--
-- Name: event_program_items; Type: ROW SECURITY; Schema: exco; Owner: -
--

ALTER TABLE exco.event_program_items ENABLE ROW LEVEL SECURITY;

--
-- Name: event_program_items event_program_items_admin_can_select; Type: POLICY; Schema: exco; Owner: -
--

CREATE POLICY event_program_items_admin_can_select ON exco.event_program_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM exco.events e
  WHERE (e.id = event_program_items.event_id))));


--
-- Name: event_rsvps; Type: ROW SECURITY; Schema: exco; Owner: -
--

ALTER TABLE exco.event_rsvps ENABLE ROW LEVEL SECURITY;

--
-- Name: event_rsvps event_rsvps_admin_can_select; Type: POLICY; Schema: exco; Owner: -
--

CREATE POLICY event_rsvps_admin_can_select ON exco.event_rsvps FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM exco.events e
  WHERE (e.id = event_rsvps.event_id))));


--
-- Name: events; Type: ROW SECURITY; Schema: exco; Owner: -
--

ALTER TABLE exco.events ENABLE ROW LEVEL SECURITY;

--
-- Name: events events_admin_can_select; Type: POLICY; Schema: exco; Owner: -
--

CREATE POLICY events_admin_can_select ON exco.events FOR SELECT TO authenticated USING ((owner_scope_id IN ( SELECT ra.scope_id
   FROM (core.role_assignments ra
     JOIN core.roles r ON ((r.id = ra.role_id)))
  WHERE ((ra.user_id = auth.uid()) AND (ra.scope_id IS NOT NULL) AND core.is_admin_role_key(r.key) AND (ra.starts_at <= now()) AND (ra.revoked_at IS NULL) AND ((ra.ends_at IS NULL) OR (ra.ends_at > now())))
UNION ALL
 SELECT s.id
   FROM core.scopes s
  WHERE ((s.scope_type = 'mainstream'::core.scope_type) AND (EXISTS ( SELECT 1
           FROM (core.role_assignments ra2
             JOIN core.roles r2 ON ((r2.id = ra2.role_id)))
          WHERE ((ra2.user_id = auth.uid()) AND (ra2.scope_id IS NULL) AND (r2.key = 'mainstream_admin'::text) AND (ra2.starts_at <= now()) AND (ra2.revoked_at IS NULL) AND ((ra2.ends_at IS NULL) OR (ra2.ends_at > now())))))))));


--
-- Name: POLICY events_admin_can_select ON events; Type: COMMENT; Schema: exco; Owner: -
--

COMMENT ON POLICY events_admin_can_select ON exco.events IS 'ADR-0041 admin-lens SELECT — siloed on owner_scope_id. Global mainstream_admin grants map to Mainstream (mirrors announcements policy).';


--
-- Name: charge_amount_versions; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.charge_amount_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: charge_amount_versions charge_amount_versions_select; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY charge_amount_versions_select ON finance.charge_amount_versions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.charges c
  WHERE ((c.id = charge_amount_versions.charge_id) AND (core.has_permission(auth.uid(), c.scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), c.scope_id, 'finance.read'::text))))));


--
-- Name: charge_categories; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.charge_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: charge_categories charge_categories_select_authenticated; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY charge_categories_select_authenticated ON finance.charge_categories FOR SELECT TO authenticated USING (true);


--
-- Name: charge_targets; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.charge_targets ENABLE ROW LEVEL SECURITY;

--
-- Name: charge_targets charge_targets_select; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY charge_targets_select ON finance.charge_targets FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.charges c
  WHERE ((c.id = charge_targets.charge_id) AND (core.has_permission(auth.uid(), c.scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), c.scope_id, 'finance.read'::text))))));


--
-- Name: charge_targets charge_targets_write; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY charge_targets_write ON finance.charge_targets TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.charges c
  WHERE ((c.id = charge_targets.charge_id) AND core.has_permission(auth.uid(), c.scope_id, 'charge.update'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM finance.charges c
  WHERE ((c.id = charge_targets.charge_id) AND core.has_permission(auth.uid(), c.scope_id, 'charge.update'::text)))));


--
-- Name: charges; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.charges ENABLE ROW LEVEL SECURITY;

--
-- Name: charges charges_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY charges_select_at_scope ON finance.charges FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), scope_id, 'finance.read'::text)));


--
-- Name: charges charges_select_via_obligation; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY charges_select_via_obligation ON finance.charges FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.obligations o
  WHERE ((o.charge_id = charges.id) AND (core.has_permission(auth.uid(), o.scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), o.scope_id, 'finance.read'::text))))));


--
-- Name: POLICY charges_select_via_obligation ON charges; Type: COMMENT; Schema: finance; Owner: -
--

COMMENT ON POLICY charges_select_via_obligation ON finance.charges IS 'Second SELECT policy — a caller can read a charge if they can already see one of its obligations. Restores the join needed by the branch-scoped Obligations page without widening the security envelope.';


--
-- Name: contribution_extensions; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.contribution_extensions ENABLE ROW LEVEL SECURITY;

--
-- Name: contribution_extensions contribution_extensions_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY contribution_extensions_select_at_scope ON finance.contribution_extensions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.charges c
  WHERE ((c.id = contribution_extensions.charge_id) AND (core.has_permission(auth.uid(), c.scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), c.scope_id, 'finance.read'::text))))));


--
-- Name: exceptions; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.exceptions ENABLE ROW LEVEL SECURITY;

--
-- Name: exceptions exceptions_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY exceptions_select_at_scope ON finance.exceptions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.charges c
  WHERE ((c.id = exceptions.charge_id) AND (core.has_permission(auth.uid(), c.scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), c.scope_id, 'finance.read'::text))))));


--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rates exchange_rates_select_authenticated; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY exchange_rates_select_authenticated ON finance.exchange_rates FOR SELECT TO authenticated USING (true);


--
-- Name: expense_categories; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.expense_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_categories expense_categories_select_authenticated; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY expense_categories_select_authenticated ON finance.expense_categories FOR SELECT TO authenticated USING (true);


--
-- Name: expense_settings; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.expense_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: expense_settings expense_settings_insert_admin; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY expense_settings_insert_admin ON finance.expense_settings FOR INSERT TO authenticated WITH CHECK (core.has_permission(auth.uid(), scope_id, 'expense_settings.manage'::text));


--
-- Name: expense_settings expense_settings_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY expense_settings_select_at_scope ON finance.expense_settings FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), scope_id, 'finance.read'::text)));


--
-- Name: expense_settings expense_settings_update_admin; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY expense_settings_update_admin ON finance.expense_settings FOR UPDATE TO authenticated USING (core.has_permission(auth.uid(), scope_id, 'expense_settings.manage'::text)) WITH CHECK (core.has_permission(auth.uid(), scope_id, 'expense_settings.manage'::text));


--
-- Name: expenses; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: expenses expenses_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY expenses_select_at_scope ON finance.expenses FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), scope_id, 'finance.read'::text)));


--
-- Name: groups; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.groups ENABLE ROW LEVEL SECURITY;

--
-- Name: groups groups_delete; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY groups_delete ON finance.groups FOR DELETE TO authenticated USING (core.has_permission(auth.uid(), scope_id, 'group.manage'::text));


--
-- Name: groups groups_insert; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY groups_insert ON finance.groups FOR INSERT TO authenticated WITH CHECK (core.has_permission(auth.uid(), scope_id, 'group.manage'::text));


--
-- Name: groups groups_select; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY groups_select ON finance.groups FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), scope_id, 'finance.read'::text)));


--
-- Name: groups groups_update; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY groups_update ON finance.groups FOR UPDATE TO authenticated USING (core.has_permission(auth.uid(), scope_id, 'group.manage'::text)) WITH CHECK (core.has_permission(auth.uid(), scope_id, 'group.manage'::text));


--
-- Name: ledger_entries; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.ledger_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: ledger_entries ledger_entries_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY ledger_entries_select_at_scope ON finance.ledger_entries FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), scope_id, 'finance.read'::text)));


--
-- Name: obligations; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.obligations ENABLE ROW LEVEL SECURITY;

--
-- Name: obligations obligations_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY obligations_select_at_scope ON finance.obligations FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), scope_id, 'finance.read'::text)));


--
-- Name: obligations obligations_select_own; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY obligations_select_own ON finance.obligations FOR SELECT TO authenticated USING (((party_type = 'member'::finance.party_type) AND (EXISTS ( SELECT 1
   FROM core.member_accounts ma
  WHERE ((ma.member_id = obligations.party_id) AND (ma.auth_user_id = auth.uid()))))));


--
-- Name: payment_intents; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.payment_intents ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_intents payment_intents_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY payment_intents_select_at_scope ON finance.payment_intents FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), scope_id, 'finance.read'::text)));


--
-- Name: payment_intents payment_intents_select_own; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY payment_intents_select_own ON finance.payment_intents FOR SELECT TO authenticated USING (((payer_member_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM core.member_accounts ma
  WHERE ((ma.member_id = payment_intents.payer_member_id) AND (ma.auth_user_id = auth.uid()))))));


--
-- Name: payments; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY payments_select_at_scope ON finance.payments FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), scope_id, 'finance.read'::text)));


--
-- Name: payments payments_select_own; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY payments_select_own ON finance.payments FOR SELECT TO authenticated USING (((payer_member_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM core.member_accounts ma
  WHERE ((ma.member_id = payments.payer_member_id) AND (ma.auth_user_id = auth.uid()))))));


--
-- Name: receipt_verifications; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.receipt_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: receipt_verifications receipt_verifications_select_authenticated; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY receipt_verifications_select_authenticated ON finance.receipt_verifications FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.payments p
  WHERE ((p.id = receipt_verifications.payment_id) AND (core.has_permission(auth.uid(), p.scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), p.scope_id, 'finance.read'::text))))));


--
-- Name: reconciliations; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.reconciliations ENABLE ROW LEVEL SECURITY;

--
-- Name: reconciliations reconciliations_select; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY reconciliations_select ON finance.reconciliations FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.payments p
  WHERE ((p.id = reconciliations.payment_id) AND (core.has_permission(auth.uid(), p.scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), p.scope_id, 'finance.read'::text))))));


--
-- Name: reconciliations reconciliations_write; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY reconciliations_write ON finance.reconciliations TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.payments p
  WHERE ((p.id = reconciliations.payment_id) AND core.has_permission(auth.uid(), p.scope_id, 'reconciliation.record'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM finance.payments p
  WHERE ((p.id = reconciliations.payment_id) AND core.has_permission(auth.uid(), p.scope_id, 'reconciliation.record'::text)))));


--
-- Name: tickets; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets tickets_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY tickets_select_at_scope ON finance.tickets FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM finance.charges c
  WHERE ((c.id = tickets.charge_id) AND (core.has_permission(auth.uid(), c.scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), c.scope_id, 'finance.read'::text))))));


--
-- Name: tickets tickets_select_own; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY tickets_select_own ON finance.tickets FOR SELECT TO authenticated USING (((buyer_member_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM core.member_accounts ma
  WHERE ((ma.member_id = tickets.buyer_member_id) AND (ma.auth_user_id = auth.uid()))))));


--
-- Name: treasury_balances; Type: ROW SECURITY; Schema: finance; Owner: -
--

ALTER TABLE finance.treasury_balances ENABLE ROW LEVEL SECURITY;

--
-- Name: treasury_balances treasury_balances_select_at_scope; Type: POLICY; Schema: finance; Owner: -
--

CREATE POLICY treasury_balances_select_at_scope ON finance.treasury_balances FOR SELECT TO authenticated USING ((core.has_permission(auth.uid(), scope_id, 'treasury.read'::text) OR core.has_permission(auth.uid(), scope_id, 'finance.read'::text)));


--
-- Name: notification_deliveries; Type: ROW SECURITY; Schema: notifications; Owner: -
--

ALTER TABLE notifications.notification_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_deliveries notification_deliveries_select; Type: POLICY; Schema: notifications; Owner: -
--

CREATE POLICY notification_deliveries_select ON notifications.notification_deliveries FOR SELECT TO authenticated USING (notifications.can_view_delivery(id));


--
-- Name: notification_events; Type: ROW SECURITY; Schema: notifications; Owner: -
--

ALTER TABLE notifications.notification_events ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_events notification_events_select; Type: POLICY; Schema: notifications; Owner: -
--

CREATE POLICY notification_events_select ON notifications.notification_events FOR SELECT TO authenticated USING (((recipient_user_id = auth.uid()) OR ((scope_id IS NOT NULL) AND core.has_permission(auth.uid(), scope_id, 'audit.read'::text))));


--
-- Name: SCHEMA audit; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT USAGE ON SCHEMA audit TO service_role;


--
-- Name: SCHEMA cms; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA cms TO anon;
GRANT USAGE ON SCHEMA cms TO authenticated;
GRANT USAGE ON SCHEMA cms TO service_role;


--
-- Name: SCHEMA core; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA core TO authenticated;
GRANT USAGE ON SCHEMA core TO service_role;


--
-- Name: SCHEMA exco; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA exco TO authenticated;
GRANT USAGE ON SCHEMA exco TO service_role;


--
-- Name: SCHEMA finance; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA finance TO authenticated;
GRANT USAGE ON SCHEMA finance TO service_role;
GRANT USAGE ON SCHEMA finance TO anon;


--
-- Name: SCHEMA notifications; Type: ACL; Schema: -; Owner: -
--

GRANT USAGE ON SCHEMA notifications TO authenticated;
GRANT USAGE ON SCHEMA notifications TO service_role;


--
-- Name: FUNCTION log_event(p_action text, p_entity_schema text, p_entity_table text, p_entity_id uuid, p_scope_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text); Type: ACL; Schema: audit; Owner: -
--

REVOKE ALL ON FUNCTION audit.log_event(p_action text, p_entity_schema text, p_entity_table text, p_entity_id uuid, p_scope_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text) FROM PUBLIC;
GRANT ALL ON FUNCTION audit.log_event(p_action text, p_entity_schema text, p_entity_table text, p_entity_id uuid, p_scope_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text) TO authenticated;
GRANT ALL ON FUNCTION audit.log_event(p_action text, p_entity_schema text, p_entity_table text, p_entity_id uuid, p_scope_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text) TO service_role;


--
-- Name: FUNCTION consume_submission_slot(p_bucket_key text, p_limit integer, p_window_seconds integer); Type: ACL; Schema: cms; Owner: -
--

REVOKE ALL ON FUNCTION cms.consume_submission_slot(p_bucket_key text, p_limit integer, p_window_seconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION cms.consume_submission_slot(p_bucket_key text, p_limit integer, p_window_seconds integer) TO anon;
GRANT ALL ON FUNCTION cms.consume_submission_slot(p_bucket_key text, p_limit integer, p_window_seconds integer) TO authenticated;
GRANT ALL ON FUNCTION cms.consume_submission_slot(p_bucket_key text, p_limit integer, p_window_seconds integer) TO service_role;


--
-- Name: FUNCTION prune_submission_throttle(p_older_than_seconds integer); Type: ACL; Schema: cms; Owner: -
--

REVOKE ALL ON FUNCTION cms.prune_submission_throttle(p_older_than_seconds integer) FROM PUBLIC;
GRANT ALL ON FUNCTION cms.prune_submission_throttle(p_older_than_seconds integer) TO service_role;


--
-- Name: FUNCTION submit_agm_registration(p_kind text, p_full_name text, p_phone text, p_amount_xaf numeric, p_payment_method text, p_email text, p_quantity integer, p_attire_size text, p_note text); Type: ACL; Schema: cms; Owner: -
--

REVOKE ALL ON FUNCTION cms.submit_agm_registration(p_kind text, p_full_name text, p_phone text, p_amount_xaf numeric, p_payment_method text, p_email text, p_quantity integer, p_attire_size text, p_note text) FROM PUBLIC;
GRANT ALL ON FUNCTION cms.submit_agm_registration(p_kind text, p_full_name text, p_phone text, p_amount_xaf numeric, p_payment_method text, p_email text, p_quantity integer, p_attire_size text, p_note text) TO anon;
GRANT ALL ON FUNCTION cms.submit_agm_registration(p_kind text, p_full_name text, p_phone text, p_amount_xaf numeric, p_payment_method text, p_email text, p_quantity integer, p_attire_size text, p_note text) TO authenticated;
GRANT ALL ON FUNCTION cms.submit_agm_registration(p_kind text, p_full_name text, p_phone text, p_amount_xaf numeric, p_payment_method text, p_email text, p_quantity integer, p_attire_size text, p_note text) TO service_role;


--
-- Name: FUNCTION can_read_member_via_membership(p_member_id uuid, p_user_id uuid); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.can_read_member_via_membership(p_member_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION core.can_read_member_via_membership(p_member_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION core.can_read_member_via_membership(p_member_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION can_view_role_history(p_role_assignment_id uuid); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.can_view_role_history(p_role_assignment_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION core.can_view_role_history(p_role_assignment_id uuid) TO authenticated;
GRANT ALL ON FUNCTION core.can_view_role_history(p_role_assignment_id uuid) TO service_role;


--
-- Name: FUNCTION change_chapter_autonomy(p_scope_id uuid, p_new_kind core.chapter_kind); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.change_chapter_autonomy(p_scope_id uuid, p_new_kind core.chapter_kind) FROM PUBLIC;
GRANT ALL ON FUNCTION core.change_chapter_autonomy(p_scope_id uuid, p_new_kind core.chapter_kind) TO authenticated;
GRANT ALL ON FUNCTION core.change_chapter_autonomy(p_scope_id uuid, p_new_kind core.chapter_kind) TO service_role;


--
-- Name: FUNCTION create_batch(p_name text, p_slug text, p_entry_year integer, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_metadata jsonb); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.create_batch(p_name text, p_slug text, p_entry_year integer, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION core.create_batch(p_name text, p_slug text, p_entry_year integer, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION core.create_batch(p_name text, p_slug text, p_entry_year integer, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_metadata jsonb) TO service_role;


--
-- Name: FUNCTION create_branch(p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.create_branch(p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION core.create_branch(p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION core.create_branch(p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb) TO service_role;


--
-- Name: FUNCTION create_chapter(p_parent_branch_id uuid, p_chapter_kind core.chapter_kind, p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.create_chapter(p_parent_branch_id uuid, p_chapter_kind core.chapter_kind, p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION core.create_chapter(p_parent_branch_id uuid, p_chapter_kind core.chapter_kind, p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION core.create_chapter(p_parent_branch_id uuid, p_chapter_kind core.chapter_kind, p_name text, p_slug text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_metadata jsonb) TO service_role;


--
-- Name: FUNCTION create_network(p_name text, p_slug text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_metadata jsonb); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.create_network(p_name text, p_slug text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION core.create_network(p_name text, p_slug text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION core.create_network(p_name text, p_slug text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_metadata jsonb) TO service_role;


--
-- Name: FUNCTION enforce_currency_immutable_once_used(); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.enforce_currency_immutable_once_used() FROM PUBLIC;


--
-- Name: FUNCTION get_user_grants(p_user_id uuid); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.get_user_grants(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION core.get_user_grants(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION core.get_user_grants(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_permissions(p_user_id uuid, p_scope_id uuid); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.get_user_permissions(p_user_id uuid, p_scope_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION core.get_user_permissions(p_user_id uuid, p_scope_id uuid) TO authenticated;
GRANT ALL ON FUNCTION core.get_user_permissions(p_user_id uuid, p_scope_id uuid) TO service_role;


--
-- Name: FUNCTION has_permission(p_user_id uuid, p_scope_id uuid, p_permission_key text); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.has_permission(p_user_id uuid, p_scope_id uuid, p_permission_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION core.has_permission(p_user_id uuid, p_scope_id uuid, p_permission_key text) TO authenticated;
GRANT ALL ON FUNCTION core.has_permission(p_user_id uuid, p_scope_id uuid, p_permission_key text) TO service_role;


--
-- Name: FUNCTION has_permission_at_any_scope(p_user_id uuid, p_key text); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.has_permission_at_any_scope(p_user_id uuid, p_key text) FROM PUBLIC;
GRANT ALL ON FUNCTION core.has_permission_at_any_scope(p_user_id uuid, p_key text) TO authenticated;
GRANT ALL ON FUNCTION core.has_permission_at_any_scope(p_user_id uuid, p_key text) TO service_role;


--
-- Name: FUNCTION mainstream_scope_id(); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.mainstream_scope_id() FROM PUBLIC;
GRANT ALL ON FUNCTION core.mainstream_scope_id() TO authenticated;
GRANT ALL ON FUNCTION core.mainstream_scope_id() TO service_role;


--
-- Name: FUNCTION member_owned_by(p_member_id uuid, p_user_id uuid); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.member_owned_by(p_member_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION core.member_owned_by(p_member_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION core.member_owned_by(p_member_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION membership_owned_by(p_membership_id uuid, p_user_id uuid); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.membership_owned_by(p_membership_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION core.membership_owned_by(p_membership_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION core.membership_owned_by(p_membership_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION notify_source_of_transfer(p_source_scope_id uuid, p_membership_id uuid, p_actor_id uuid); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.notify_source_of_transfer(p_source_scope_id uuid, p_membership_id uuid, p_actor_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION core.notify_source_of_transfer(p_source_scope_id uuid, p_membership_id uuid, p_actor_id uuid) TO authenticated;
GRANT ALL ON FUNCTION core.notify_source_of_transfer(p_source_scope_id uuid, p_membership_id uuid, p_actor_id uuid) TO service_role;


--
-- Name: FUNCTION perform_transfer(p_source_membership_id uuid, p_destination_scope_id uuid, p_approved_by uuid, p_transfer_request_id uuid); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.perform_transfer(p_source_membership_id uuid, p_destination_scope_id uuid, p_approved_by uuid, p_transfer_request_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION core.perform_transfer(p_source_membership_id uuid, p_destination_scope_id uuid, p_approved_by uuid, p_transfer_request_id uuid) TO authenticated;
GRANT ALL ON FUNCTION core.perform_transfer(p_source_membership_id uuid, p_destination_scope_id uuid, p_approved_by uuid, p_transfer_request_id uuid) TO service_role;


--
-- Name: TABLE registration_status; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.registration_status TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.registration_status TO service_role;


--
-- Name: FUNCTION registration_state(p_fee_required boolean, p_marked_paid_at timestamp with time zone, p_waived_at timestamp with time zone, p_paid_on_behalf_at timestamp with time zone); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.registration_state(p_fee_required boolean, p_marked_paid_at timestamp with time zone, p_waived_at timestamp with time zone, p_paid_on_behalf_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION core.registration_state(p_fee_required boolean, p_marked_paid_at timestamp with time zone, p_waived_at timestamp with time zone, p_paid_on_behalf_at timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION core.registration_state(p_fee_required boolean, p_marked_paid_at timestamp with time zone, p_waived_at timestamp with time zone, p_paid_on_behalf_at timestamp with time zone) TO service_role;


--
-- Name: FUNCTION update_batch(p_scope_id uuid, p_name text, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_status core.scope_status); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.update_batch(p_scope_id uuid, p_name text, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_status core.scope_status) FROM PUBLIC;
GRANT ALL ON FUNCTION core.update_batch(p_scope_id uuid, p_name text, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_status core.scope_status) TO authenticated;
GRANT ALL ON FUNCTION core.update_batch(p_scope_id uuid, p_name text, p_ordinal integer, p_nickname text, p_description text, p_contact_email text, p_contact_phone text, p_status core.scope_status) TO service_role;


--
-- Name: FUNCTION update_branch(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.update_branch(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) FROM PUBLIC;
GRANT ALL ON FUNCTION core.update_branch(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) TO authenticated;
GRANT ALL ON FUNCTION core.update_branch(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) TO service_role;


--
-- Name: FUNCTION update_chapter(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.update_chapter(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) FROM PUBLIC;
GRANT ALL ON FUNCTION core.update_chapter(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) TO authenticated;
GRANT ALL ON FUNCTION core.update_chapter(p_scope_id uuid, p_name text, p_country_code text, p_region text, p_city text, p_currency_code text, p_nickname text, p_description text, p_registration_fee_required boolean, p_registration_fee_amount numeric, p_registration_fee_currency text, p_contact_email text, p_contact_phone text, p_status core.scope_status) TO service_role;


--
-- Name: FUNCTION update_network(p_scope_id uuid, p_name text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_status core.scope_status); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.update_network(p_scope_id uuid, p_name text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_status core.scope_status) FROM PUBLIC;
GRANT ALL ON FUNCTION core.update_network(p_scope_id uuid, p_name text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_status core.scope_status) TO authenticated;
GRANT ALL ON FUNCTION core.update_network(p_scope_id uuid, p_name text, p_short_name text, p_description text, p_icon text, p_color_hex text, p_sort_order integer, p_status core.scope_status) TO service_role;


--
-- Name: FUNCTION would_be_last_admin(p_role_assignment_id uuid); Type: ACL; Schema: core; Owner: -
--

REVOKE ALL ON FUNCTION core.would_be_last_admin(p_role_assignment_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION core.would_be_last_admin(p_role_assignment_id uuid) TO authenticated;
GRANT ALL ON FUNCTION core.would_be_last_admin(p_role_assignment_id uuid) TO service_role;


--
-- Name: FUNCTION count_audience(def jsonb); Type: ACL; Schema: exco; Owner: -
--

REVOKE ALL ON FUNCTION exco.count_audience(def jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION exco.count_audience(def jsonb) TO service_role;


--
-- Name: FUNCTION events_block_archive_with_paid_contribution(); Type: ACL; Schema: exco; Owner: -
--

GRANT ALL ON FUNCTION exco.events_block_archive_with_paid_contribution() TO service_role;


--
-- Name: FUNCTION resolve_audience(def jsonb); Type: ACL; Schema: exco; Owner: -
--

REVOKE ALL ON FUNCTION exco.resolve_audience(def jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION exco.resolve_audience(def jsonb) TO service_role;


--
-- Name: FUNCTION can_read_reports(p_scope_id uuid); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.can_read_reports(p_scope_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.can_read_reports(p_scope_id uuid) TO authenticated;
GRANT ALL ON FUNCTION finance.can_read_reports(p_scope_id uuid) TO service_role;


--
-- Name: FUNCTION compute_period(p_recurrence finance.charge_recurrence, p_interval integer, p_reference timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.compute_period(p_recurrence finance.charge_recurrence, p_interval integer, p_reference timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.compute_period(p_recurrence finance.charge_recurrence, p_interval integer, p_reference timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION finance.compute_period(p_recurrence finance.charge_recurrence, p_interval integer, p_reference timestamp with time zone) TO service_role;


--
-- Name: FUNCTION effective_amount(p_charge_id uuid, p_target_scope_id uuid, p_period_start date); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.effective_amount(p_charge_id uuid, p_target_scope_id uuid, p_period_start date) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.effective_amount(p_charge_id uuid, p_target_scope_id uuid, p_period_start date) TO authenticated;
GRANT ALL ON FUNCTION finance.effective_amount(p_charge_id uuid, p_target_scope_id uuid, p_period_start date) TO service_role;


--
-- Name: FUNCTION generate_obligations_for_charge(p_charge_id uuid, p_reference timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.generate_obligations_for_charge(p_charge_id uuid, p_reference timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.generate_obligations_for_charge(p_charge_id uuid, p_reference timestamp with time zone) TO service_role;


--
-- Name: FUNCTION generate_obligations_sweep(p_reference timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.generate_obligations_sweep(p_reference timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.generate_obligations_sweep(p_reference timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_arrears(p_scope_id uuid); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.get_arrears(p_scope_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.get_arrears(p_scope_id uuid) TO authenticated;
GRANT ALL ON FUNCTION finance.get_arrears(p_scope_id uuid) TO service_role;


--
-- Name: FUNCTION get_collections(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.get_collections(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.get_collections(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION finance.get_collections(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_contribution_progress(p_charge_id uuid); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.get_contribution_progress(p_charge_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.get_contribution_progress(p_charge_id uuid) TO authenticated;
GRANT ALL ON FUNCTION finance.get_contribution_progress(p_charge_id uuid) TO service_role;


--
-- Name: FUNCTION get_donation_report(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.get_donation_report(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.get_donation_report(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION finance.get_donation_report(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_exchange_rate(p_from_currency text, p_to_currency text, p_at timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.get_exchange_rate(p_from_currency text, p_to_currency text, p_at timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.get_exchange_rate(p_from_currency text, p_to_currency text, p_at timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION finance.get_exchange_rate(p_from_currency text, p_to_currency text, p_at timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_expense_report_by_category(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.get_expense_report_by_category(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.get_expense_report_by_category(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION finance.get_expense_report_by_category(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_member_statement(p_member_id uuid, p_from timestamp with time zone, p_to timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.get_member_statement(p_member_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.get_member_statement(p_member_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION finance.get_member_statement(p_member_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_payment_method_breakdown(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.get_payment_method_breakdown(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.get_payment_method_breakdown(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION finance.get_payment_method_breakdown(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;


--
-- Name: FUNCTION get_treasury_statement(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.get_treasury_statement(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.get_treasury_statement(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION finance.get_treasury_statement(p_scope_id uuid, p_from timestamp with time zone, p_to timestamp with time zone) TO service_role;


--
-- Name: FUNCTION resolve_exception_for_charge(p_charge_id uuid, p_member_id uuid, p_reference timestamp with time zone); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.resolve_exception_for_charge(p_charge_id uuid, p_member_id uuid, p_reference timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.resolve_exception_for_charge(p_charge_id uuid, p_member_id uuid, p_reference timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION finance.resolve_exception_for_charge(p_charge_id uuid, p_member_id uuid, p_reference timestamp with time zone) TO service_role;


--
-- Name: FUNCTION schedule_amount_change(p_charge_id uuid, p_target_scope_id uuid, p_amount numeric, p_actor uuid); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.schedule_amount_change(p_charge_id uuid, p_target_scope_id uuid, p_amount numeric, p_actor uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.schedule_amount_change(p_charge_id uuid, p_target_scope_id uuid, p_amount numeric, p_actor uuid) TO service_role;


--
-- Name: FUNCTION verify_receipt(p_token text); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.verify_receipt(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.verify_receipt(p_token text) TO anon;
GRANT ALL ON FUNCTION finance.verify_receipt(p_token text) TO authenticated;
GRANT ALL ON FUNCTION finance.verify_receipt(p_token text) TO service_role;


--
-- Name: FUNCTION write_ledger_from_expense(p_expense_id uuid); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.write_ledger_from_expense(p_expense_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.write_ledger_from_expense(p_expense_id uuid) TO service_role;


--
-- Name: FUNCTION write_ledger_from_payment(p_payment_id uuid); Type: ACL; Schema: finance; Owner: -
--

REVOKE ALL ON FUNCTION finance.write_ledger_from_payment(p_payment_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION finance.write_ledger_from_payment(p_payment_id uuid) TO service_role;


--
-- Name: FUNCTION can_view_delivery(p_delivery_id uuid); Type: ACL; Schema: notifications; Owner: -
--

REVOKE ALL ON FUNCTION notifications.can_view_delivery(p_delivery_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION notifications.can_view_delivery(p_delivery_id uuid) TO authenticated;
GRANT ALL ON FUNCTION notifications.can_view_delivery(p_delivery_id uuid) TO service_role;


--
-- Name: FUNCTION queue_delete(p_queue text, p_msg_id bigint); Type: ACL; Schema: notifications; Owner: -
--

REVOKE ALL ON FUNCTION notifications.queue_delete(p_queue text, p_msg_id bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION notifications.queue_delete(p_queue text, p_msg_id bigint) TO service_role;


--
-- Name: FUNCTION queue_read(p_queue text, p_vt integer, p_qty integer); Type: ACL; Schema: notifications; Owner: -
--

REVOKE ALL ON FUNCTION notifications.queue_read(p_queue text, p_vt integer, p_qty integer) FROM PUBLIC;
GRANT ALL ON FUNCTION notifications.queue_read(p_queue text, p_vt integer, p_qty integer) TO service_role;


--
-- Name: FUNCTION queue_send(p_queue text, p_message jsonb); Type: ACL; Schema: notifications; Owner: -
--

REVOKE ALL ON FUNCTION notifications.queue_send(p_queue text, p_message jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION notifications.queue_send(p_queue text, p_message jsonb) TO service_role;


--
-- Name: FUNCTION requeue_stranded_events(p_older_than_seconds integer, p_limit integer); Type: ACL; Schema: notifications; Owner: -
--

REVOKE ALL ON FUNCTION notifications.requeue_stranded_events(p_older_than_seconds integer, p_limit integer) FROM PUBLIC;
GRANT ALL ON FUNCTION notifications.requeue_stranded_events(p_older_than_seconds integer, p_limit integer) TO service_role;


--
-- Name: TABLE audit_entries; Type: ACL; Schema: audit; Owner: -
--

GRANT SELECT,INSERT ON TABLE audit.audit_entries TO authenticated;
GRANT SELECT,INSERT ON TABLE audit.audit_entries TO service_role;


--
-- Name: TABLE agm_registrations; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT,UPDATE ON TABLE cms.agm_registrations TO authenticated;
GRANT ALL ON TABLE cms.agm_registrations TO service_role;


--
-- Name: TABLE article_categories; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.article_categories TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.article_categories TO authenticated;
GRANT ALL ON TABLE cms.article_categories TO service_role;


--
-- Name: TABLE article_categories_map; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.article_categories_map TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.article_categories_map TO authenticated;
GRANT ALL ON TABLE cms.article_categories_map TO service_role;


--
-- Name: TABLE articles; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.articles TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.articles TO authenticated;
GRANT ALL ON TABLE cms.articles TO service_role;


--
-- Name: TABLE batch_leaders; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.batch_leaders TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.batch_leaders TO authenticated;
GRANT ALL ON TABLE cms.batch_leaders TO service_role;


--
-- Name: TABLE branch_leaders; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.branch_leaders TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.branch_leaders TO authenticated;
GRANT ALL ON TABLE cms.branch_leaders TO service_role;


--
-- Name: TABLE diaspora_leaders; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.diaspora_leaders TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.diaspora_leaders TO authenticated;
GRANT ALL ON TABLE cms.diaspora_leaders TO service_role;


--
-- Name: TABLE gallery_album_categories; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.gallery_album_categories TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.gallery_album_categories TO authenticated;
GRANT ALL ON TABLE cms.gallery_album_categories TO service_role;


--
-- Name: TABLE gallery_album_categories_map; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.gallery_album_categories_map TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.gallery_album_categories_map TO authenticated;
GRANT ALL ON TABLE cms.gallery_album_categories_map TO service_role;


--
-- Name: TABLE gallery_albums; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.gallery_albums TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.gallery_albums TO authenticated;
GRANT ALL ON TABLE cms.gallery_albums TO service_role;


--
-- Name: TABLE gallery_media; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.gallery_media TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.gallery_media TO authenticated;
GRANT ALL ON TABLE cms.gallery_media TO service_role;


--
-- Name: TABLE mainstream_leaders; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.mainstream_leaders TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.mainstream_leaders TO authenticated;
GRANT ALL ON TABLE cms.mainstream_leaders TO service_role;


--
-- Name: TABLE mainstream_sectors; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.mainstream_sectors TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.mainstream_sectors TO authenticated;
GRANT ALL ON TABLE cms.mainstream_sectors TO service_role;


--
-- Name: TABLE organ_sectors; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.organ_sectors TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.organ_sectors TO authenticated;
GRANT ALL ON TABLE cms.organ_sectors TO service_role;


--
-- Name: TABLE organs; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.organs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.organs TO authenticated;
GRANT ALL ON TABLE cms.organs TO service_role;


--
-- Name: TABLE project_categories; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.project_categories TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.project_categories TO authenticated;
GRANT ALL ON TABLE cms.project_categories TO service_role;


--
-- Name: TABLE project_categories_map; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.project_categories_map TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.project_categories_map TO authenticated;
GRANT ALL ON TABLE cms.project_categories_map TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.projects TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.projects TO authenticated;
GRANT ALL ON TABLE cms.projects TO service_role;


--
-- Name: TABLE site_event_categories; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.site_event_categories TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.site_event_categories TO authenticated;
GRANT ALL ON TABLE cms.site_event_categories TO service_role;


--
-- Name: TABLE site_event_categories_map; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.site_event_categories_map TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.site_event_categories_map TO authenticated;
GRANT ALL ON TABLE cms.site_event_categories_map TO service_role;


--
-- Name: TABLE site_events; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.site_events TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.site_events TO authenticated;
GRANT ALL ON TABLE cms.site_events TO service_role;


--
-- Name: TABLE song_groups; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.song_groups TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.song_groups TO authenticated;
GRANT ALL ON TABLE cms.song_groups TO service_role;


--
-- Name: TABLE songs; Type: ACL; Schema: cms; Owner: -
--

GRANT SELECT ON TABLE cms.songs TO anon;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE cms.songs TO authenticated;
GRANT ALL ON TABLE cms.songs TO service_role;


--
-- Name: TABLE submission_throttle; Type: ACL; Schema: cms; Owner: -
--

GRANT ALL ON TABLE cms.submission_throttle TO service_role;


--
-- Name: TABLE batches; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.batches TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.batches TO service_role;


--
-- Name: TABLE branches; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.branches TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.branches TO service_role;


--
-- Name: TABLE chapters; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.chapters TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.chapters TO service_role;


--
-- Name: TABLE grouping_chapter_tags; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.grouping_chapter_tags TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.grouping_chapter_tags TO service_role;


--
-- Name: TABLE houses; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.houses TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.houses TO service_role;


--
-- Name: TABLE import_batches; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.import_batches TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.import_batches TO service_role;


--
-- Name: TABLE import_rows; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.import_rows TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.import_rows TO service_role;


--
-- Name: TABLE member_accounts; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.member_accounts TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.member_accounts TO service_role;


--
-- Name: TABLE members; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.members TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.members TO service_role;


--
-- Name: TABLE membership_transfers; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.membership_transfers TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.membership_transfers TO service_role;


--
-- Name: TABLE memberships; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.memberships TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.memberships TO service_role;


--
-- Name: TABLE networks; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.networks TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.networks TO service_role;


--
-- Name: TABLE permissions; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.permissions TO authenticated;
GRANT SELECT ON TABLE core.permissions TO service_role;


--
-- Name: TABLE position_assignments; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.position_assignments TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.position_assignments TO service_role;


--
-- Name: TABLE position_catalog; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.position_catalog TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE core.position_catalog TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.profiles TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE core.profiles TO service_role;


--
-- Name: TABLE role_assignments; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT,UPDATE ON TABLE core.role_assignments TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE core.role_assignments TO service_role;


--
-- Name: TABLE role_history; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT,INSERT ON TABLE core.role_history TO authenticated;
GRANT SELECT,INSERT ON TABLE core.role_history TO service_role;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.role_permissions TO authenticated;
GRANT SELECT ON TABLE core.role_permissions TO service_role;


--
-- Name: TABLE roles; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.roles TO authenticated;
GRANT SELECT ON TABLE core.roles TO service_role;


--
-- Name: TABLE scope_capabilities; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.scope_capabilities TO authenticated;
GRANT SELECT ON TABLE core.scope_capabilities TO service_role;


--
-- Name: TABLE scopes; Type: ACL; Schema: core; Owner: -
--

GRANT SELECT ON TABLE core.scopes TO authenticated;
GRANT SELECT ON TABLE core.scopes TO service_role;


--
-- Name: TABLE announcements; Type: ACL; Schema: exco; Owner: -
--

GRANT ALL ON TABLE exco.announcements TO service_role;
GRANT SELECT ON TABLE exco.announcements TO authenticated;


--
-- Name: TABLE event_program_items; Type: ACL; Schema: exco; Owner: -
--

GRANT ALL ON TABLE exco.event_program_items TO service_role;
GRANT SELECT ON TABLE exco.event_program_items TO authenticated;


--
-- Name: TABLE event_rsvps; Type: ACL; Schema: exco; Owner: -
--

GRANT ALL ON TABLE exco.event_rsvps TO service_role;
GRANT SELECT ON TABLE exco.event_rsvps TO authenticated;


--
-- Name: TABLE events; Type: ACL; Schema: exco; Owner: -
--

GRANT ALL ON TABLE exco.events TO service_role;
GRANT SELECT ON TABLE exco.events TO authenticated;


--
-- Name: TABLE charge_amount_versions; Type: ACL; Schema: finance; Owner: -
--

GRANT ALL ON TABLE finance.charge_amount_versions TO service_role;
GRANT SELECT ON TABLE finance.charge_amount_versions TO authenticated;


--
-- Name: TABLE charge_categories; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.charge_categories TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.charge_categories TO service_role;


--
-- Name: TABLE charge_targets; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.charge_targets TO authenticated;
GRANT ALL ON TABLE finance.charge_targets TO service_role;


--
-- Name: TABLE charges; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.charges TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.charges TO service_role;


--
-- Name: TABLE contribution_extensions; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.contribution_extensions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.contribution_extensions TO service_role;


--
-- Name: TABLE exceptions; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.exceptions TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.exceptions TO service_role;


--
-- Name: TABLE exchange_rates; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.exchange_rates TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.exchange_rates TO service_role;


--
-- Name: TABLE expense_categories; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.expense_categories TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.expense_categories TO service_role;


--
-- Name: TABLE expense_settings; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.expense_settings TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.expense_settings TO service_role;


--
-- Name: TABLE expenses; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.expenses TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.expenses TO service_role;


--
-- Name: TABLE groups; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.groups TO authenticated;
GRANT ALL ON TABLE finance.groups TO service_role;


--
-- Name: TABLE ledger_entries; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.ledger_entries TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.ledger_entries TO service_role;


--
-- Name: TABLE obligations; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.obligations TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.obligations TO service_role;


--
-- Name: TABLE payment_intents; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.payment_intents TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE finance.payment_intents TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.payments TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.payments TO service_role;


--
-- Name: SEQUENCE receipt_number_seq; Type: ACL; Schema: finance; Owner: -
--

GRANT USAGE ON SEQUENCE finance.receipt_number_seq TO service_role;


--
-- Name: TABLE receipt_verifications; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.receipt_verifications TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.receipt_verifications TO service_role;


--
-- Name: TABLE reconciliations; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.reconciliations TO authenticated;
GRANT ALL ON TABLE finance.reconciliations TO service_role;


--
-- Name: TABLE tickets; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.tickets TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.tickets TO service_role;


--
-- Name: TABLE treasury_balances; Type: ACL; Schema: finance; Owner: -
--

GRANT SELECT ON TABLE finance.treasury_balances TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE finance.treasury_balances TO service_role;


--
-- Name: TABLE notification_deliveries; Type: ACL; Schema: notifications; Owner: -
--

GRANT SELECT ON TABLE notifications.notification_deliveries TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE notifications.notification_deliveries TO service_role;


--
-- Name: TABLE notification_events; Type: ACL; Schema: notifications; Owner: -
--

GRANT SELECT ON TABLE notifications.notification_events TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE notifications.notification_events TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: cms; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA cms GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA cms GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO authenticated;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: exco; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA exco GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: exco; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA exco GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: exco; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA exco GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: finance; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA finance GRANT SELECT ON TABLES TO service_role;

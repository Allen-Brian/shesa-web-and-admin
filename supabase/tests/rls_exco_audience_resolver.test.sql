-- pgTAP: exco.resolve_audience + exco.count_audience — the shared
-- Audience/Publishing engine's SQL core.
--
-- Not strictly an RLS test — these functions run as superuser during
-- test (SECURITY INVOKER + service_role grant is the runtime posture,
-- but pgTAP runs as postgres). The important assertions here are the
-- combination-rule semantics from docs/product/entities.md:
--
--   * "All" drops out of the AND.
--   * OR within a group.
--   * AND across groups.
--   * Baseline: only members with at least one active membership.
--
-- Fixture layout (mnemonic 2-hex-char last-segment suffixes):
--   Users / members: 'a1'=Alice, 'a2'=Bob, 'a3'=Carol, 'a4'=Dave (no
--     active membership — baseline should exclude)
--   Scopes: 'ba'=Branch CM (Cameroon), 'bb'=Branch UK (UK)
--   Reuses seeded houses (St Thomas 33...0001, St Peter 33...0002, St
--   John 33...0004) and networks (Legal 44...0001, Tech 44...0003).

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, exco, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated, anon;

SELECT plan(10);

-------------------------------------------------------------------------------
-- Setup — 2 branches, 4 members, 3 with active memberships
-------------------------------------------------------------------------------

-- Auth users
INSERT INTO auth.users (id, email, instance_id) VALUES
  ('77777788-0000-0000-0000-0000000000a1', 'alice@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('77777788-0000-0000-0000-0000000000a2', 'bob@shesa.test',   '00000000-0000-0000-0000-000000000000'),
  ('77777788-0000-0000-0000-0000000000a3', 'carol@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('77777788-0000-0000-0000-0000000000a4', 'dave@shesa.test',  '00000000-0000-0000-0000-000000000000');

-- Branch scopes (parent Mainstream)
INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id) VALUES
  ('77777788-1111-0000-0000-0000000000ba', 'Test CM Branch', 't-audres-cm', 'branch',
   '00000000-0000-0000-0000-000000000001'),
  ('77777788-1111-0000-0000-0000000000bb', 'Test UK Branch', 't-audres-uk', 'branch',
   '00000000-0000-0000-0000-000000000001');

-- Members
--   Alice: house=StThomas, network=Legal, batch=1953, lives in Yaoundé/CM
--   Bob:   house=StPeter,  network=Legal, batch=1953, lives in Yaoundé/CM
--   Carol: house=StThomas, network=Tech,  batch=1953, lives in London/UK
--   Dave:  house=StJohn,   network=Tech,  batch=1953, no location, no active membership
INSERT INTO core.members (
  id, full_name, email, batch_scope_id, house_scope_id, network_scope_id,
  current_country, current_region_state, current_city
) VALUES
  ('77777788-4444-0000-0000-0000000000a1', 'Alice A', 'alice@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001',  -- St Thomas
   '44444444-0000-0000-0000-000000000001',  -- Legal
   'CM', 'Centre', 'Yaoundé'),
  ('77777788-4444-0000-0000-0000000000a2', 'Bob B', 'bob@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000002',  -- St Peter
   '44444444-0000-0000-0000-000000000001',  -- Legal
   'CM', 'Centre', 'Yaoundé'),
  ('77777788-4444-0000-0000-0000000000a3', 'Carol C', 'carol@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000001',  -- St Thomas
   '44444444-0000-0000-0000-000000000003',  -- Tech
   'GB', 'London', 'London'),
  ('77777788-4444-0000-0000-0000000000a4', 'Dave D', 'dave@shesa.test',
   (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
   '33333333-0000-0000-0000-000000000004',  -- St John
   '44444444-0000-0000-0000-000000000003',  -- Tech
   NULL, NULL, NULL);

-- Memberships: Alice + Bob active at CM, Carol active at UK, Dave has NO active membership
INSERT INTO core.memberships (id, member_id, scope_id, membership_status, join_method, joined_at) VALUES
  ('77777788-5555-0000-0000-0000000000a1',
   '77777788-4444-0000-0000-0000000000a1',
   '77777788-1111-0000-0000-0000000000ba',
   'active', 'self_request', NOW()),
  ('77777788-5555-0000-0000-0000000000a2',
   '77777788-4444-0000-0000-0000000000a2',
   '77777788-1111-0000-0000-0000000000ba',
   'active', 'self_request', NOW()),
  ('77777788-5555-0000-0000-0000000000a3',
   '77777788-4444-0000-0000-0000000000a3',
   '77777788-1111-0000-0000-0000000000bb',
   'active', 'self_request', NOW());

-- Dave has a 'left' membership — should NOT be in any audience.
-- Terminal statuses ('left' / 'transferred') require the matching
-- timestamp per the memberships_status_terminal_timestamps CHECK.
INSERT INTO core.memberships (
  id, member_id, scope_id, membership_status, join_method, joined_at, left_at
) VALUES (
  '77777788-5555-0000-0000-0000000000a4',
  '77777788-4444-0000-0000-0000000000a4',
  '77777788-1111-0000-0000-0000000000ba',
  'left', 'self_request', NOW() - INTERVAL '2 years', NOW() - INTERVAL '1 year');

-------------------------------------------------------------------------------
-- Test 1: baseline — all groups 'all' returns the 3 members with an
-- active membership (Alice, Bob, Carol). Dave excluded because 'left'.
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.resolve_audience(
    '{"version":1,
      "membership":{"mode":"all"},
      "location":{"mode":"all"},
      "houses":{"mode":"all"},
      "networks":{"mode":"all"},
      "batches":{"mode":"all"}}'::jsonb
   ) WHERE member_id::text LIKE '77777788-4444%'),
  3,
  'all-all-all-all-all returns only members with an active membership (Dave excluded)'
);

-------------------------------------------------------------------------------
-- Test 2: membership filter narrows to CM branch — Alice + Bob (2)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.resolve_audience(
    jsonb_build_object(
      'version', 1,
      'membership', jsonb_build_object(
        'mode', 'specific',
        'scopeIds', jsonb_build_array('77777788-1111-0000-0000-0000000000ba')
      ),
      'location',  jsonb_build_object('mode','all'),
      'houses',    jsonb_build_object('mode','all'),
      'networks',  jsonb_build_object('mode','all'),
      'batches',   jsonb_build_object('mode','all')
    )
  ) WHERE member_id::text LIKE '77777788-4444%'),
  2,
  'membership=[CM branch] narrows to the 2 active CM members (Alice, Bob)'
);

-------------------------------------------------------------------------------
-- Test 3: OR-within-group (Houses = [St Thomas, St Peter]) — 3 members
-- Alice (St Thomas), Bob (St Peter), Carol (St Thomas). Dave excluded.
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.resolve_audience(
    jsonb_build_object(
      'version', 1,
      'membership', jsonb_build_object('mode','all'),
      'location',   jsonb_build_object('mode','all'),
      'houses',     jsonb_build_object(
        'mode', 'specific',
        'scopeIds', jsonb_build_array(
          '33333333-0000-0000-0000-000000000001',
          '33333333-0000-0000-0000-000000000002')
      ),
      'networks',   jsonb_build_object('mode','all'),
      'batches',    jsonb_build_object('mode','all')
    )
  ) WHERE member_id::text LIKE '77777788-4444%'),
  3,
  'houses=[StThomas, StPeter] returns 3 members (OR within group)'
);

-------------------------------------------------------------------------------
-- Test 4: AND-across-groups — Houses=[StThomas] AND Networks=[Legal]
-- Alice: StThomas + Legal ✓
-- Bob:   StPeter + Legal — StThomas fails
-- Carol: StThomas + Tech — Legal fails
-- Result: Alice only (1)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.resolve_audience(
    jsonb_build_object(
      'version', 1,
      'membership', jsonb_build_object('mode','all'),
      'location',   jsonb_build_object('mode','all'),
      'houses',     jsonb_build_object(
        'mode', 'specific',
        'scopeIds', jsonb_build_array('33333333-0000-0000-0000-000000000001')
      ),
      'networks',   jsonb_build_object(
        'mode', 'specific',
        'scopeIds', jsonb_build_array('44444444-0000-0000-0000-000000000001')
      ),
      'batches',    jsonb_build_object('mode','all')
    )
  ) WHERE member_id::text LIKE '77777788-4444%'),
  1,
  'houses=[StThomas] AND networks=[Legal] returns 1 (Alice) — AND across groups'
);

-------------------------------------------------------------------------------
-- Test 5: location by country — [CM] returns Alice + Bob (2)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.resolve_audience(
    jsonb_build_object(
      'version', 1,
      'membership', jsonb_build_object('mode','all'),
      'location',   jsonb_build_object(
        'mode', 'specific',
        'countries', jsonb_build_array('CM')
      ),
      'houses',     jsonb_build_object('mode','all'),
      'networks',   jsonb_build_object('mode','all'),
      'batches',    jsonb_build_object('mode','all')
    )
  ) WHERE member_id::text LIKE '77777788-4444%'),
  2,
  'location=countries[CM] returns Alice + Bob (member-level residence)'
);

-------------------------------------------------------------------------------
-- Test 6: location by region — [London] returns Carol (1)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.resolve_audience(
    jsonb_build_object(
      'version', 1,
      'membership', jsonb_build_object('mode','all'),
      'location',   jsonb_build_object(
        'mode', 'specific',
        'regions', jsonb_build_array('London')
      ),
      'houses',     jsonb_build_object('mode','all'),
      'networks',   jsonb_build_object('mode','all'),
      'batches',    jsonb_build_object('mode','all')
    )
  ) WHERE member_id::text LIKE '77777788-4444%'),
  1,
  'location=regions[London] returns Carol only'
);

-------------------------------------------------------------------------------
-- Test 7: location OR-within — countries=[CM] OR regions=[London]
-- returns Alice + Bob + Carol (3)
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.resolve_audience(
    jsonb_build_object(
      'version', 1,
      'membership', jsonb_build_object('mode','all'),
      'location',   jsonb_build_object(
        'mode', 'specific',
        'countries', jsonb_build_array('CM'),
        'regions',   jsonb_build_array('London')
      ),
      'houses',     jsonb_build_object('mode','all'),
      'networks',   jsonb_build_object('mode','all'),
      'batches',    jsonb_build_object('mode','all')
    )
  ) WHERE member_id::text LIKE '77777788-4444%'),
  3,
  'location OR-within: countries=[CM] OR regions=[London] returns all 3 active members'
);

-------------------------------------------------------------------------------
-- Test 8: batches specific to 1953 — all 3 active members (they all
-- share the seeded 1953 batch). Really just verifies the batches
-- predicate binds correctly.
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM exco.resolve_audience(
    jsonb_build_object(
      'version', 1,
      'membership', jsonb_build_object('mode','all'),
      'location',   jsonb_build_object('mode','all'),
      'houses',     jsonb_build_object('mode','all'),
      'networks',   jsonb_build_object('mode','all'),
      'batches',    jsonb_build_object(
        'mode', 'specific',
        'scopeIds', jsonb_build_array(
          (SELECT id::text FROM core.scopes WHERE slug = 'batch-1953')
        )
      )
    )
  ) WHERE member_id::text LIKE '77777788-4444%'),
  3,
  'batches=[1953] returns 3 (all active test members are batch-1953)'
);

-------------------------------------------------------------------------------
-- Test 9: count_audience matches resolve_audience length
-------------------------------------------------------------------------------

-- Narrow to test-CM-branch via membership filter so seed members
-- (who are members of seeded branches, not test-CM) don't participate.
SELECT is(
  (SELECT exco.count_audience(
    jsonb_build_object(
      'version', 1,
      'membership', jsonb_build_object(
        'mode', 'specific',
        'scopeIds', jsonb_build_array('77777788-1111-0000-0000-0000000000ba')
      ),
      'location',   jsonb_build_object('mode','all'),
      'houses',     jsonb_build_object(
        'mode', 'specific',
        'scopeIds', jsonb_build_array('33333333-0000-0000-0000-000000000001')
      ),
      'networks',   jsonb_build_object(
        'mode', 'specific',
        'scopeIds', jsonb_build_array('44444444-0000-0000-0000-000000000001')
      ),
      'batches',    jsonb_build_object('mode','all')
    )
  )),
  1,
  'count_audience matches resolve_audience: membership=CM AND houses=[StThomas] AND networks=[Legal] → Alice only'
);

-------------------------------------------------------------------------------
-- Test 10: invalid mode raises 22023
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ SELECT * FROM exco.resolve_audience(
       '{"version":1,
         "membership":{"mode":"bogus"},
         "location":{"mode":"all"},
         "houses":{"mode":"all"},
         "networks":{"mode":"all"},
         "batches":{"mode":"all"}}'::jsonb
     ) $$,
  '22023',
  NULL,
  'invalid mode (not "all" or "specific") raises 22023'
);

-------------------------------------------------------------------------------
-- Finish
-------------------------------------------------------------------------------

SELECT * FROM finish();

ROLLBACK;

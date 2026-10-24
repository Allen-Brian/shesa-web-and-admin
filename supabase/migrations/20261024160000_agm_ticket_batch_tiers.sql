-- Migration: 20261024160000_agm_ticket_batch_tiers.sql
-- Add batch-tiered ticket charges for AGM 2026:
-- 1. Batch 2017: 10,000 XAF ('88888888-2026-1111-0000-000000000004')
-- 2. Batch 2018-2019: 5,000 XAF ('88888888-2026-1111-0000-000000000005')
--
-- We copy scope_id, group_id, created_by, and currency directly from the
-- existing standard ticket charge ('88888888-2026-1111-0000-000000000002')
-- so this is 100% resilient to production foreign keys and scopes.

INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency,
   target_filter, target_party_type, lifecycle, open_date, close_date,
   status, group_id, created_by, created_at, updated_at)
SELECT
  '88888888-2026-1111-0000-000000000004'::uuid,
  c.scope_id,
  'ticketed',
  'Ticket (Batch 2017)',
  'AGM 2026 entry ticket - Batch 2017 at 10 000 XAF per head.',
  10000,
  c.currency,
  '{}'::jsonb,
  c.target_party_type,
  c.lifecycle,
  c.open_date,
  c.close_date,
  c.status,
  c.group_id,
  c.created_by,
  NOW(),
  NOW()
FROM finance.charges c
WHERE c.id = '88888888-2026-1111-0000-000000000002'
ON CONFLICT (id) DO NOTHING;

INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency,
   target_filter, target_party_type, lifecycle, open_date, close_date,
   status, group_id, created_by, created_at, updated_at)
SELECT
  '88888888-2026-1111-0000-000000000005'::uuid,
  c.scope_id,
  'ticketed',
  'Ticket (Batch 2018-2019)',
  'AGM 2026 entry ticket - Recent Alumni (Batch 2018-2019) at 5 000 XAF per head.',
  5000,
  c.currency,
  '{}'::jsonb,
  c.target_party_type,
  c.lifecycle,
  c.open_date,
  c.close_date,
  c.status,
  c.group_id,
  c.created_by,
  NOW(),
  NOW()
FROM finance.charges c
WHERE c.id = '88888888-2026-1111-0000-000000000002'
ON CONFLICT (id) DO NOTHING;

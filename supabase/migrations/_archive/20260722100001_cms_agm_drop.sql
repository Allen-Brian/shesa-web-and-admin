-- Migration: cms_agm_drop
--
-- Retires the standalone CMS-side AGM tables in favour of the new
-- finance model (AGM 2026 becomes a finance.groups row; tickets +
-- attire become finance.charges rows with shape='ticketed'; donations
-- become finance.charges rows with shape='donation').
--
-- IF EXISTS on every drop so this migration is safe against either
-- state: local dev where only `cms.agm_tickets` was ever applied, and
-- the future case where the whole trio has been created.

BEGIN;

DROP TABLE IF EXISTS cms.agm_attire_orders CASCADE;
DROP TABLE IF EXISTS cms.agm_donations     CASCADE;
DROP TABLE IF EXISTS cms.agm_tickets       CASCADE;

COMMIT;

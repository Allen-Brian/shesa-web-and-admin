-- Migration: add_profiles_preferred_persona
--
-- Phase 2 pivot (ADR-0040): the merged `apps/admin` Next.js app has
-- three personas — Exco, Finance, Editor. A user with grants for
-- multiple personas needs a sticky choice that survives cleared
-- browsers + new devices; localStorage alone leaves finance officers
-- landing in the wrong persona on a fresh install.
--
-- This column is the server-side authoritative value. Flow:
--   - Persona layout Server Components read profiles.preferred_persona.
--   - On persona switch, a Server Action writes here + revalidates.
--   - localStorage still mirrors for optimistic UI (hydration flash),
--     but this row wins.
--
-- If NULL (first-time user), the client-side resolver falls back to a
-- grant-weighted heuristic (see packages/domain/src/persona later).
-- No RLS change — profiles already lets a user UPDATE their own row.

ALTER TABLE core.profiles
  ADD COLUMN preferred_persona TEXT
  CHECK (preferred_persona IS NULL OR preferred_persona IN ('exco', 'finance', 'editor'));

COMMENT ON COLUMN core.profiles.preferred_persona IS
  'Server-side sticky persona choice for the admin app (Phase 2 ADR-0040). Written on every persona switch via Server Action; read on login. NULL = use client-side grant-weighted heuristic. Values: exco / finance / editor.';

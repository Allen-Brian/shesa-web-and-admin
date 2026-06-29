/**
 * Generic Zod validators reused across Shesa (per ADR-0027 / ADR-0004).
 *
 * Domain-specific schemas (e.g. `createChargeSchema`) live alongside the
 * Server Actions or services that own them. This file is for the truly
 * generic shapes used in many places: email, UUID, phone (Cameroonian
 * format).
 */

import { z } from 'zod';

/** A trimmed, lowercase email. */
export const emailSchema = z.string().trim().toLowerCase().email();

/** A v4/v5 UUID. Supabase uses these for `auth.users.id` and most PKs. */
export const uuidSchema = z.string().uuid();

/** ISO-8601 date string (no time). Use for birthdates, exit years, etc. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

/**
 * Cameroonian phone number — accepts both E.164 (`+237…`) and local
 * (`6XXXXXXXX` for mobile, `2XXXXXXXX` for landline).
 *
 * MTN MoMo and Orange Money APIs vary slightly in what they accept;
 * the server normalizes to E.164 before invoking provider SDKs.
 */
export const phoneCmSchema = z
  .string()
  .trim()
  .regex(/^(\+237)?[26]\d{8}$/, 'Invalid Cameroonian phone number');

/** Non-empty, trimmed string. Use for names, slugs, etc. */
export const nonEmptyString = z.string().trim().min(1);

/**
 * A kebab-case slug — `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Used for
 * scope slugs (`shesa-buea`, `2012-batch`, etc.).
 */
export const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be kebab-case');

/** A positive amount in the smallest currency unit (XAF is integer-only). */
export const amountSchema = z.number().int().nonnegative();

/** A pagination cursor. Use with `useInfiniteQuery`. */
export const cursorSchema = z.string().min(1).optional();

/** A pagination limit, bounded so a client can't request a huge page. */
export const limitSchema = z.number().int().min(1).max(100).default(20);

/**
 * Shared discriminated-union return shape for every Server Action in
 * this section. Kept in a non-'use server' file so callers can `import
 * type` it without pulling in a Server Action module boundary.
 */
export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

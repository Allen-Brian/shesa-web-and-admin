/**
 * Duplicate-detection helper for member creation + import.
 *
 * Phase 1 §2.12: an import row (or a manually created member) is flagged
 * as a possible duplicate if it matches an existing member on any of:
 *
 *   - same email (case-insensitive)
 *   - same phone (exact)
 *   - same full_name (case-insensitive)
 *   - same full_name + same batch (case-insensitive)
 *
 * The flag is a *signal*, not a rejection — the operator confirms the
 * outcome in the import review UI (or the create form). "Flag not
 * silently merge" is the whole point.
 *
 * This module is intentionally pure: it takes a candidate + the set of
 * potentially-matching existing rows and returns a signals object.
 * Fetching the existing rows is the caller's job (Edge Function or SPA);
 * the SQL predicate is a range of duplicate-detection indexes on
 * core.members added in E1.2.
 */

export interface MemberDupeCandidate {
  fullName: string;
  email: string | null;
  phone: string | null;
  batchScopeId: string;
}

export interface ExistingMemberForDupeCheck {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  batchScopeId: string;
}

export interface DuplicateSignals {
  sameEmail: string[];
  samePhone: string[];
  sameName: string[];
  sameNameAndBatch: string[];
}

/**
 * Emptiness helper — callers can `if (isAnyDuplicateSignal(signals))`
 * without walking the four arrays.
 */
export function isAnyDuplicateSignal(signals: DuplicateSignals): boolean {
  return (
    signals.sameEmail.length > 0 ||
    signals.samePhone.length > 0 ||
    signals.sameName.length > 0 ||
    signals.sameNameAndBatch.length > 0
  );
}

const normalizeEmail = (v: string | null): string | null => (v ? v.trim().toLowerCase() : null);
const normalizeName = (v: string): string => v.trim().toLowerCase().replace(/\s+/g, ' ');
const normalizePhone = (v: string | null): string | null => (v ? v.trim() : null);

/**
 * Compare `candidate` against `existing` rows and return which rows
 * match on which signal. Signal arrays hold matched member IDs so the
 * review UI can link straight to the offending record.
 */
export function findDuplicateSignals(
  candidate: MemberDupeCandidate,
  existing: readonly ExistingMemberForDupeCheck[],
): DuplicateSignals {
  const signals: DuplicateSignals = {
    sameEmail: [],
    samePhone: [],
    sameName: [],
    sameNameAndBatch: [],
  };

  const cEmail = normalizeEmail(candidate.email);
  const cPhone = normalizePhone(candidate.phone);
  const cName = normalizeName(candidate.fullName);
  const cBatch = candidate.batchScopeId;

  for (const row of existing) {
    if (cEmail && normalizeEmail(row.email) === cEmail) {
      signals.sameEmail.push(row.id);
    }
    if (cPhone && normalizePhone(row.phone) === cPhone) {
      signals.samePhone.push(row.id);
    }
    const rName = normalizeName(row.fullName);
    if (rName === cName) {
      signals.sameName.push(row.id);
      if (row.batchScopeId === cBatch) {
        signals.sameNameAndBatch.push(row.id);
      }
    }
  }

  return signals;
}

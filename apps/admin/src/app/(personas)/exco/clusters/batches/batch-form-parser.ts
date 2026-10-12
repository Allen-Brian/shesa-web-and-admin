import type { BatchFormField } from './batch-form-types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENT_YEAR = new Date().getUTCFullYear();

export interface NormalizedBatchForm {
  readonly scopeId: string | null;
  readonly name: string | null;
  readonly slug: string | null;
  readonly entryYearRaw: string | null;
  readonly ordinalRaw: string | null;
  readonly nickname: string | null;
  readonly description: string | null;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
}

/**
 * Read + trim every batch-form field into a nullable-string record.
 * Empty strings collapse to null so downstream code doesn't have to
 * distinguish between the two.
 */
export function normalizeBatchForm(form: FormData): NormalizedBatchForm {
  const readString = (k: string): string | null => {
    const raw = form.get(k);
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  };
  return {
    scopeId: readString('scopeId'),
    name: readString('name'),
    slug: readString('slug'),
    entryYearRaw: readString('entryYear'),
    ordinalRaw: readString('ordinal'),
    nickname: readString('nickname'),
    description: readString('description'),
    contactEmail: readString('contactEmail'),
    contactPhone: readString('contactPhone'),
  };
}

/**
 * Validate the normalized form. `mode` decides whether create-only
 * fields (slug, entry year) are required. Returns the field errors +
 * the parsed numeric values (entryYear, ordinal) when valid.
 */
export function validateBatchForm(
  v: NormalizedBatchForm,
  mode: 'create' | 'edit',
): {
  readonly fieldErrors: Partial<Record<BatchFormField, string>>;
  readonly entryYear: number | null;
  readonly ordinal: number | null;
} {
  const fieldErrors: Partial<Record<BatchFormField, string>> = {};

  if (!v.name) fieldErrors.name = 'Batch name is required.';

  if (mode === 'create') {
    if (!v.slug) fieldErrors.slug = 'Slug is required.';
    else if (!SLUG_PATTERN.test(v.slug))
      fieldErrors.slug = 'Slug must be lowercase kebab-case (e.g. batch-2012).';
  }

  let entryYear: number | null = null;
  if (mode === 'create') {
    if (!v.entryYearRaw) fieldErrors.entryYear = 'Entry year is required.';
    else {
      const parsed = Number.parseInt(v.entryYearRaw, 10);
      if (Number.isNaN(parsed) || parsed < 1900 || parsed > CURRENT_YEAR + 5)
        fieldErrors.entryYear = `Entry year must be between 1900 and ${CURRENT_YEAR + 5}.`;
      else entryYear = parsed;
    }
  }

  let ordinal: number | null = null;
  if (v.ordinalRaw) {
    const parsed = Number.parseInt(v.ordinalRaw, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 999)
      fieldErrors.ordinal = 'Ordinal must be a positive integer under 1000.';
    else ordinal = parsed;
  }

  if (v.contactEmail && !EMAIL_PATTERN.test(v.contactEmail))
    fieldErrors.contactEmail = 'Contact email is not a valid address.';

  return { fieldErrors, entryYear, ordinal };
}

/**
 * Convert a normalized form back to string values suitable for
 * populating the form on a re-render after validation failure — every
 * field is a string (empty when null) so `defaultValue` works cleanly.
 */
export function preserveBatchFormValues(v: NormalizedBatchForm) {
  return {
    name: v.name ?? '',
    slug: v.slug ?? '',
    entryYear: v.entryYearRaw ?? '',
    ordinal: v.ordinalRaw ?? '',
    nickname: v.nickname ?? '',
    description: v.description ?? '',
    contactEmail: v.contactEmail ?? '',
    contactPhone: v.contactPhone ?? '',
  };
}

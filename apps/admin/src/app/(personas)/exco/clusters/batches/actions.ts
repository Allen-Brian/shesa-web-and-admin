'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage, extractScopeId } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

export type BatchFormState =
  | { ok: true; scopeId?: string }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<BatchFormField, string>>;
      values?: Partial<Record<BatchFormField, string>>;
    };

type BatchFormField =
  | 'name'
  | 'slug'
  | 'entryYear'
  | 'ordinal'
  | 'nickname'
  | 'description'
  | 'contactEmail'
  | 'contactPhone';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENT_YEAR = new Date().getUTCFullYear();

function normalize(form: FormData) {
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

function validate(v: ReturnType<typeof normalize>, mode: 'create' | 'edit') {
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

function preserve(v: ReturnType<typeof normalize>) {
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

export async function createBatch(
  _prev: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  const v = normalize(formData);
  const { fieldErrors, entryYear, ordinal } = validate(v, 'create');
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserve(v) };
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('batches/create-batch', {
    body: {
      name: v.name,
      slug: v.slug,
      entryYear,
      ordinal,
      nickname: v.nickname,
      description: v.description,
      contactEmail: v.contactEmail,
      contactPhone: v.contactPhone,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create the batch.'),
      values: preserve(v),
    };
  }
  const scopeId = extractScopeId(data);
  if (!scopeId) {
    return {
      ok: false,
      message: 'Create succeeded but returned no scope id.',
      values: preserve(v),
    };
  }

  revalidatePath('/exco/clusters/batches');
  return { ok: true, scopeId };
}

export async function updateBatch(
  _prev: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  const v = normalize(formData);
  if (!v.scopeId) {
    return { ok: false, message: 'Missing batch id.', values: preserve(v) };
  }
  const { fieldErrors, ordinal } = validate(v, 'edit');
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserve(v) };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('batches/update-batch', {
    body: {
      scopeId: v.scopeId,
      name: v.name,
      ordinal,
      nickname: v.nickname,
      description: v.description,
      contactEmail: v.contactEmail,
      contactPhone: v.contactPhone,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not save the batch.'),
      values: preserve(v),
    };
  }

  revalidatePath('/exco/clusters/batches', 'layout');
  return { ok: true, scopeId: v.scopeId };
}

export interface ArchiveResult {
  readonly ok: boolean;
  readonly scopeId: string;
  readonly message?: string;
}

export async function archiveBatch(scopeId: string): Promise<ArchiveResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('batches/update-batch', {
    body: { scopeId, status: 'archived' },
  });
  if (error) {
    return { ok: false, scopeId, message: await extractInvokeMessage(error, 'Could not archive.') };
  }
  revalidatePath('/exco/clusters/batches', 'layout');
  return { ok: true, scopeId };
}

'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage, extractScopeId } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

import {
  normalizeBatchForm,
  preserveBatchFormValues,
  validateBatchForm,
} from './batch-form-parser';
import type { ArchiveResult, BatchFormState } from './batch-form-types';

// Callers import member-import actions from `./batch-import-actions`
// and member CRUD from `./batch-member-actions` directly. Types live
// in `batch-import-types` / `batch-member-types` (non-server files).

// ─── Batch form ──────────────────────────────────────────────────────

export async function createBatch(
  _prev: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  const v = normalizeBatchForm(formData);
  const { fieldErrors, entryYear, ordinal } = validateBatchForm(v, 'create');
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserveBatchFormValues(v) };
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
      values: preserveBatchFormValues(v),
    };
  }
  const scopeId = extractScopeId(data);
  if (!scopeId) {
    return {
      ok: false,
      message: 'Create succeeded but returned no scope id.',
      values: preserveBatchFormValues(v),
    };
  }

  revalidatePath('/exco/clusters/batches');
  return { ok: true, scopeId };
}

export async function updateBatch(
  _prev: BatchFormState,
  formData: FormData,
): Promise<BatchFormState> {
  const v = normalizeBatchForm(formData);
  if (!v.scopeId) {
    return { ok: false, message: 'Missing batch id.', values: preserveBatchFormValues(v) };
  }
  const { fieldErrors, ordinal } = validateBatchForm(v, 'edit');
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserveBatchFormValues(v) };
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
      values: preserveBatchFormValues(v),
    };
  }

  revalidatePath('/exco/clusters/batches', 'layout');
  return { ok: true, scopeId: v.scopeId };
}

// ─── Archive / restore ───────────────────────────────────────────────

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

export async function restoreBatch(scopeId: string): Promise<ArchiveResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('batches/update-batch', {
    body: { scopeId, status: 'active' },
  });
  if (error) {
    return { ok: false, scopeId, message: await extractInvokeMessage(error, 'Could not restore.') };
  }
  revalidatePath('/exco/clusters/batches', 'layout');
  return { ok: true, scopeId };
}

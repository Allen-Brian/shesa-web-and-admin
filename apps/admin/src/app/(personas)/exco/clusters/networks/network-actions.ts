'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage, extractScopeId } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

export type NetworkFormState =
  | { ok: true; scopeId?: string }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<NetworkFormField, string>>;
      values?: Partial<Record<NetworkFormField, string>>;
    };

type NetworkFormField =
  'name' | 'shortName' | 'slug' | 'description' | 'icon' | 'colorHex' | 'sortOrder';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_PATTERN = /^#[0-9a-f]{3}([0-9a-f]{3}([0-9a-f]{2})?)?$/i;

/**
 * Form actions no longer `redirect()` on success — they return
 * `{ ok: true, scopeId }` so the calling dialog can close itself,
 * toast, and `router.refresh()`. Validation errors round-trip via
 * `useActionState`; the Edge Function still validates + audits
 * server-side (defense in depth).
 */

function normalize(form: FormData) {
  const readString = (k: string): string | null => {
    const raw = form.get(k);
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  };
  return {
    name: readString('name'),
    shortName: readString('shortName'),
    slug: readString('slug'),
    description: readString('description'),
    icon: readString('icon'),
    colorHex: readString('colorHex'),
    sortOrderRaw: readString('sortOrder'),
    scopeId: readString('scopeId'),
  };
}

function validate(v: ReturnType<typeof normalize>) {
  const fieldErrors: Partial<Record<NetworkFormField, string>> = {};

  if (!v.name) fieldErrors.name = 'Network name is required.';
  else if (v.name.length > 200) fieldErrors.name = 'Network name must be under 200 characters.';

  if (!v.shortName) fieldErrors.shortName = 'Short name is required.';
  else if (v.shortName.length > 40)
    fieldErrors.shortName = 'Short name must be under 40 characters.';

  if (!v.slug) fieldErrors.slug = 'Slug is required.';
  else if (!SLUG_PATTERN.test(v.slug))
    fieldErrors.slug = 'Slug must be lowercase kebab-case (e.g. shesa-legal).';

  if (v.colorHex && !HEX_PATTERN.test(v.colorHex))
    fieldErrors.colorHex = 'Color must be a hex code (e.g. #7C3AED).';

  let sortOrder = 0;
  if (v.sortOrderRaw != null) {
    const parsed = Number.parseInt(v.sortOrderRaw, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 999)
      fieldErrors.sortOrder = 'Sort order must be between 0 and 999.';
    else sortOrder = parsed;
  }

  return { fieldErrors, sortOrder };
}

function preserveValues(
  v: ReturnType<typeof normalize>,
): Partial<Record<NetworkFormField, string>> {
  return {
    name: v.name ?? '',
    shortName: v.shortName ?? '',
    slug: v.slug ?? '',
    description: v.description ?? '',
    icon: v.icon ?? '',
    colorHex: v.colorHex ?? '',
    sortOrder: v.sortOrderRaw ?? '0',
  };
}

/** Create a new network. Mainstream Admin only — enforced server-side by the Edge Function. */
export async function createNetwork(
  _prev: NetworkFormState,
  formData: FormData,
): Promise<NetworkFormState> {
  const v = normalize(formData);
  const { fieldErrors, sortOrder } = validate(v);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserveValues(v) };
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('networks/create-network', {
    body: {
      name: v.name,
      slug: v.slug,
      shortName: v.shortName,
      description: v.description,
      icon: v.icon,
      colorHex: v.colorHex,
      sortOrder,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create the network. Try again.'),
      values: preserveValues(v),
    };
  }
  const scopeId = extractScopeId(data);
  if (!scopeId) {
    return {
      ok: false,
      message: 'The create call succeeded but returned no scope id.',
      values: preserveValues(v),
    };
  }

  revalidatePath('/exco/clusters/networks');
  return { ok: true, scopeId };
}

/** Update an existing network. Mainstream Admin only. */
export async function updateNetwork(
  _prev: NetworkFormState,
  formData: FormData,
): Promise<NetworkFormState> {
  const v = normalize(formData);
  if (!v.scopeId) {
    return { ok: false, message: 'Missing network id.', values: preserveValues(v) };
  }
  const { fieldErrors, sortOrder } = validate(v);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserveValues(v) };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('networks/update-network', {
    body: {
      scopeId: v.scopeId,
      name: v.name,
      shortName: v.shortName,
      description: v.description,
      icon: v.icon,
      colorHex: v.colorHex,
      sortOrder,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not save the network.'),
      values: preserveValues(v),
    };
  }

  revalidatePath('/exco/clusters/networks', 'layout');
  return { ok: true, scopeId: v.scopeId };
}

export interface ArchiveResult {
  readonly ok: boolean;
  readonly scopeId: string;
  readonly message?: string;
}

/**
 * Soft-archive a network. As of 2026-07-02 the RPC no longer blocks the
 * transition when members are attached — the archived state simply
 * hides the network from dropdowns; existing member references keep
 * resolving until an admin reassigns them.
 */
export async function archiveNetwork(scopeId: string): Promise<ArchiveResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('networks/update-network', {
    body: { scopeId, status: 'archived' },
  });
  if (error) {
    return {
      ok: false,
      scopeId,
      message: await extractInvokeMessage(error, 'Could not archive.'),
    };
  }
  revalidatePath('/exco/clusters/networks', 'layout');
  return { ok: true, scopeId };
}

export async function restoreNetwork(scopeId: string): Promise<ArchiveResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('networks/update-network', {
    body: { scopeId, status: 'active' },
  });
  if (error) {
    return {
      ok: false,
      scopeId,
      message: await extractInvokeMessage(error, 'Could not restore.'),
    };
  }
  revalidatePath('/exco/clusters/networks', 'layout');
  return { ok: true, scopeId };
}

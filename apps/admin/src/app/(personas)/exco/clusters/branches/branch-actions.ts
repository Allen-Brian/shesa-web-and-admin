'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage, extractScopeId } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

export type BranchFormState =
  | { ok: true; scopeId?: string }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<BranchFormField, string>>;
      values?: Partial<Record<BranchFormField, string>>;
    };

type BranchFormField =
  | 'name'
  | 'slug'
  | 'nickname'
  | 'description'
  | 'countryCode'
  | 'region'
  | 'city'
  | 'currencyCode'
  | 'registrationFeeAmount'
  | 'registrationFeeCurrency'
  | 'contactEmail'
  | 'contactPhone';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO2 = /^[A-Z]{2}$/;
const ISO4217 = /^[A-Z]{3}$/;

function normalize(form: FormData) {
  const readString = (k: string): string | null => {
    const raw = form.get(k);
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  };
  const readBool = (k: string): boolean => form.get(k) === 'on' || form.get(k) === 'true';
  return {
    scopeId: readString('scopeId'),
    name: readString('name'),
    slug: readString('slug'),
    nickname: readString('nickname'),
    description: readString('description'),
    countryCode: readString('countryCode')?.toUpperCase() ?? null,
    region: readString('region'),
    city: readString('city'),
    currencyCode: readString('currencyCode')?.toUpperCase() ?? null,
    registrationFeeRequired: readBool('registrationFeeRequired'),
    registrationFeeAmount: readString('registrationFeeAmount'),
    registrationFeeCurrency: readString('registrationFeeCurrency')?.toUpperCase() ?? null,
    contactEmail: readString('contactEmail'),
    contactPhone: readString('contactPhone'),
  };
}

function validate(v: ReturnType<typeof normalize>) {
  const fieldErrors: Partial<Record<BranchFormField, string>> = {};

  if (!v.name) fieldErrors.name = 'Branch name is required.';
  if (!v.slug) fieldErrors.slug = 'Slug is required.';
  else if (!SLUG_PATTERN.test(v.slug)) fieldErrors.slug = 'Slug must be lowercase kebab-case.';

  if (!v.countryCode) fieldErrors.countryCode = 'Country is required.';
  else if (!ISO2.test(v.countryCode))
    fieldErrors.countryCode = 'Country must be an ISO 3166-1 alpha-2 code.';

  if (!v.region) fieldErrors.region = 'Region / state is required.';
  if (!v.city) fieldErrors.city = 'City is required.';

  if (!v.currencyCode) fieldErrors.currencyCode = 'Currency is required.';
  else if (!ISO4217.test(v.currencyCode))
    fieldErrors.currencyCode = 'Currency must be a three-letter ISO 4217 code.';

  let registrationFeeAmount: number | null = null;
  if (v.registrationFeeRequired) {
    if (!v.registrationFeeAmount)
      fieldErrors.registrationFeeAmount = 'Amount is required when the fee is enabled.';
    else {
      const parsed = Number.parseFloat(v.registrationFeeAmount);
      if (Number.isNaN(parsed) || parsed < 0)
        fieldErrors.registrationFeeAmount = 'Amount must be a non-negative number.';
      else registrationFeeAmount = parsed;
    }
  } else if (v.registrationFeeAmount) {
    const parsed = Number.parseFloat(v.registrationFeeAmount);
    if (!Number.isNaN(parsed) && parsed >= 0) registrationFeeAmount = parsed;
  }

  if (v.registrationFeeCurrency && !ISO4217.test(v.registrationFeeCurrency)) {
    fieldErrors.registrationFeeCurrency = 'Fee currency must be a three-letter ISO 4217 code.';
  }

  if (v.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contactEmail)) {
    fieldErrors.contactEmail = 'Contact email is not a valid address.';
  }

  return { fieldErrors, registrationFeeAmount };
}

function preserve(v: ReturnType<typeof normalize>) {
  return {
    name: v.name ?? '',
    slug: v.slug ?? '',
    nickname: v.nickname ?? '',
    description: v.description ?? '',
    countryCode: v.countryCode ?? '',
    region: v.region ?? '',
    city: v.city ?? '',
    currencyCode: v.currencyCode ?? '',
    registrationFeeAmount: v.registrationFeeAmount ?? '',
    registrationFeeCurrency: v.registrationFeeCurrency ?? '',
    contactEmail: v.contactEmail ?? '',
    contactPhone: v.contactPhone ?? '',
  };
}

export async function createBranch(
  _prev: BranchFormState,
  formData: FormData,
): Promise<BranchFormState> {
  const v = normalize(formData);
  const { fieldErrors, registrationFeeAmount } = validate(v);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserve(v) };
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('branches/create-branch', {
    body: {
      name: v.name,
      slug: v.slug,
      countryCode: v.countryCode,
      region: v.region,
      city: v.city,
      currencyCode: v.currencyCode,
      nickname: v.nickname,
      description: v.description,
      registrationFeeRequired: v.registrationFeeRequired,
      registrationFeeAmount,
      registrationFeeCurrency: v.registrationFeeCurrency,
      contactEmail: v.contactEmail,
      contactPhone: v.contactPhone,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create the branch. Try again.'),
      values: preserve(v),
    };
  }
  const scopeId = extractScopeId(data);
  if (!scopeId) {
    return {
      ok: false,
      message: 'The create call succeeded but returned no scope id.',
      values: preserve(v),
    };
  }

  revalidatePath('/exco/clusters/branches');
  return { ok: true, scopeId };
}

export async function updateBranch(
  _prev: BranchFormState,
  formData: FormData,
): Promise<BranchFormState> {
  const v = normalize(formData);
  if (!v.scopeId) {
    return { ok: false, message: 'Missing branch id.', values: preserve(v) };
  }
  const { fieldErrors, registrationFeeAmount } = validate(v);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserve(v) };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('branches/update-branch', {
    body: {
      scopeId: v.scopeId,
      name: v.name,
      countryCode: v.countryCode,
      region: v.region,
      city: v.city,
      currencyCode: v.currencyCode,
      nickname: v.nickname,
      description: v.description,
      registrationFeeRequired: v.registrationFeeRequired,
      registrationFeeAmount,
      registrationFeeCurrency: v.registrationFeeCurrency,
      contactEmail: v.contactEmail,
      contactPhone: v.contactPhone,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not save the branch.'),
      values: preserve(v),
    };
  }

  revalidatePath('/exco/clusters/branches', 'layout');
  return { ok: true, scopeId: v.scopeId };
}

export interface ArchiveResult {
  readonly ok: boolean;
  readonly scopeId: string;
  readonly message?: string;
}

export async function archiveBranch(scopeId: string): Promise<ArchiveResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('branches/update-branch', {
    body: { scopeId, status: 'archived' },
  });
  if (error) {
    return { ok: false, scopeId, message: await extractInvokeMessage(error, 'Could not archive.') };
  }
  revalidatePath('/exco/clusters/branches', 'layout');
  return { ok: true, scopeId };
}

export async function restoreBranch(scopeId: string): Promise<ArchiveResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('branches/update-branch', {
    body: { scopeId, status: 'active' },
  });
  if (error) {
    return { ok: false, scopeId, message: await extractInvokeMessage(error, 'Could not restore.') };
  }
  revalidatePath('/exco/clusters/branches', 'layout');
  return { ok: true, scopeId };
}

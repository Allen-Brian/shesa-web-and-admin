'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage, extractScopeId } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

export type ChapterFormState =
  | { ok: true; scopeId?: string }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<ChapterFormField, string>>;
      values?: Partial<Record<ChapterFormField, string>>;
    };

type ChapterFormField =
  | 'name'
  | 'slug'
  | 'nickname'
  | 'description'
  | 'chapterKind'
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
const CHAPTER_KINDS = ['autonomous', 'grouping'] as const;
type ChapterKind = (typeof CHAPTER_KINDS)[number];

function normalize(form: FormData) {
  const readString = (k: string): string | null => {
    const raw = form.get(k);
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length === 0 ? null : trimmed;
  };
  const readBool = (k: string): boolean => form.get(k) === 'on' || form.get(k) === 'true';
  const kindRaw = readString('chapterKind');
  return {
    scopeId: readString('scopeId'),
    parentBranchId: readString('parentBranchId'),
    chapterKind:
      kindRaw && (CHAPTER_KINDS as readonly string[]).includes(kindRaw)
        ? (kindRaw as ChapterKind)
        : null,
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

function validate(v: ReturnType<typeof normalize>, mode: 'create' | 'edit') {
  const fieldErrors: Partial<Record<ChapterFormField, string>> = {};

  if (!v.name) fieldErrors.name = 'Chapter name is required.';
  if (!v.slug) fieldErrors.slug = 'Slug is required.';
  else if (!SLUG_PATTERN.test(v.slug)) fieldErrors.slug = 'Slug must be lowercase kebab-case.';

  if (mode === 'create' && !v.chapterKind) fieldErrors.chapterKind = 'Pick autonomous or grouping.';

  if (!v.countryCode) fieldErrors.countryCode = 'Country is required.';
  else if (!ISO2.test(v.countryCode))
    fieldErrors.countryCode = 'Country must be an ISO 3166-1 alpha-2 code.';

  if (!v.region) fieldErrors.region = 'Region / state is required.';
  if (!v.city) fieldErrors.city = 'City is required.';

  let registrationFeeAmount: number | null = null;
  const isAutonomous = v.chapterKind === 'autonomous';
  if (isAutonomous) {
    if (!v.currencyCode) fieldErrors.currencyCode = 'Autonomous chapters need a currency.';
    else if (!ISO4217.test(v.currencyCode))
      fieldErrors.currencyCode = 'Currency must be a three-letter ISO 4217 code.';

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
  }

  return { fieldErrors, registrationFeeAmount };
}

function preserve(v: ReturnType<typeof normalize>) {
  return {
    name: v.name ?? '',
    slug: v.slug ?? '',
    nickname: v.nickname ?? '',
    description: v.description ?? '',
    chapterKind: v.chapterKind ?? '',
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

export async function createChapter(
  _prev: ChapterFormState,
  formData: FormData,
): Promise<ChapterFormState> {
  const v = normalize(formData);
  if (!v.parentBranchId)
    return { ok: false, message: 'Missing parent branch id.', values: preserve(v) };

  const { fieldErrors, registrationFeeAmount } = validate(v, 'create');
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserve(v) };
  }
  if (!v.chapterKind) {
    return { ok: false, message: 'Chapter kind is required.', values: preserve(v) };
  }

  const isAutonomous = v.chapterKind === 'autonomous';
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('chapters/create-chapter', {
    body: {
      parentBranchId: v.parentBranchId,
      chapterKind: v.chapterKind,
      name: v.name,
      slug: v.slug,
      countryCode: v.countryCode,
      region: v.region,
      city: v.city,
      currencyCode: isAutonomous ? v.currencyCode : null,
      nickname: v.nickname,
      description: v.description,
      registrationFeeRequired: isAutonomous ? v.registrationFeeRequired : false,
      registrationFeeAmount: isAutonomous ? registrationFeeAmount : null,
      registrationFeeCurrency: isAutonomous ? v.registrationFeeCurrency : null,
      contactEmail: isAutonomous ? v.contactEmail : null,
      contactPhone: isAutonomous ? v.contactPhone : null,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create the chapter.'),
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

  revalidatePath('/exco/clusters/branches', 'layout');
  return { ok: true, scopeId };
}

export async function updateChapter(
  _prev: ChapterFormState,
  formData: FormData,
): Promise<ChapterFormState> {
  const v = normalize(formData);
  if (!v.scopeId) {
    return { ok: false, message: 'Missing chapter id.', values: preserve(v) };
  }
  const { fieldErrors, registrationFeeAmount } = validate(v, 'edit');
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values: preserve(v) };
  }

  const isAutonomous = v.chapterKind === 'autonomous';
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('chapters/update-chapter', {
    body: {
      scopeId: v.scopeId,
      name: v.name,
      countryCode: v.countryCode,
      region: v.region,
      city: v.city,
      currencyCode: isAutonomous ? v.currencyCode : null,
      nickname: v.nickname,
      description: v.description,
      registrationFeeRequired: isAutonomous ? v.registrationFeeRequired : false,
      registrationFeeAmount: isAutonomous ? registrationFeeAmount : null,
      registrationFeeCurrency: isAutonomous ? v.registrationFeeCurrency : null,
      contactEmail: isAutonomous ? v.contactEmail : null,
      contactPhone: isAutonomous ? v.contactPhone : null,
    },
  });

  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not save the chapter.'),
      values: preserve(v),
    };
  }

  revalidatePath('/exco/clusters/branches', 'layout');
  return { ok: true, scopeId: v.scopeId };
}

export interface ChapterActionResult {
  readonly ok: boolean;
  readonly scopeId: string;
  readonly message?: string;
}

export async function archiveChapter(scopeId: string): Promise<ChapterActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('chapters/update-chapter', {
    body: { scopeId, status: 'archived' },
  });
  if (error) {
    return { ok: false, scopeId, message: await extractInvokeMessage(error, 'Could not archive.') };
  }
  revalidatePath('/exco/clusters/branches', 'layout');
  return { ok: true, scopeId };
}

export async function restoreChapter(scopeId: string): Promise<ChapterActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('chapters/update-chapter', {
    body: { scopeId, status: 'active' },
  });
  if (error) {
    return { ok: false, scopeId, message: await extractInvokeMessage(error, 'Could not restore.') };
  }
  revalidatePath('/exco/clusters/branches', 'layout');
  return { ok: true, scopeId };
}

export async function changeChapterAutonomy(
  scopeId: string,
  chapterKind: 'autonomous' | 'grouping',
): Promise<ChapterActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('chapters/set-chapter-autonomy', {
    body: { scopeId, chapterKind },
  });
  if (error) {
    return {
      ok: false,
      scopeId,
      message: await extractInvokeMessage(error, 'Could not change autonomy.'),
    };
  }
  revalidatePath('/exco/clusters/branches', 'layout');
  return { ok: true, scopeId };
}

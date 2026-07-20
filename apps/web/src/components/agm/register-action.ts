'use server';

import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import type { PaymentOption } from './data';

/**
 * Alphabet used for the ticket code. Deliberately excludes ambiguous
 * glyphs (0/O, 1/I) so the code the registrant reads off the receipt
 * cannot be mis-transcribed by the check-in desk.
 */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export interface RegisterInput {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly amountXaf: number;
  readonly paymentOption: PaymentOption;
}

export type RegisterResult =
  { readonly ok: true; readonly code: string } | { readonly ok: false; readonly message: string };

/**
 * Insert a new registration row and return the generated ticket code.
 * We do not move money — the row lands as `status = 'issued'` and
 * Finance flips it to `paid` later.
 */
export async function registerForAgm(input: RegisterInput): Promise<RegisterResult> {
  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return { ok: false, message: 'Please enter your full name.' };
  }
  if (!Number.isFinite(input.amountXaf) || input.amountXaf < 0) {
    return { ok: false, message: 'Amount must be a positive number.' };
  }

  const supabase = await getServerClient();

  // Retry once on the (astronomically unlikely) collision — same as
  // the pattern we use for invite codes.
  for (let attempt = 0; attempt < 2; attempt++) {
    const code = randomCode();
    const { error } = await supabase
      .schema('cms' as never)
      .from('agm_tickets' as never)
      .insert({
        code,
        full_name: fullName,
        email: input.email.trim() || null,
        phone: input.phone.trim() || null,
        amount_xaf: input.amountXaf,
        payment_option: input.paymentOption,
      } as never);

    if (!error) {
      return { ok: true, code };
    }
    if (!error.message.toLowerCase().includes('duplicate')) {
      return { ok: false, message: error.message };
    }
  }
  return { ok: false, message: 'Could not generate a unique ticket code. Please try again.' };
}

/**
 * Form-action variant used by the plain `<form action={…}>`
 * submission. Extracts fields from FormData and redirects to the
 * receipt page on success.
 */
export async function registerForAgmForm(formData: FormData): Promise<void> {
  const res = await registerForAgm({
    fullName: String(formData.get('fullName') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    amountXaf: Number.parseFloat(String(formData.get('amountXaf') ?? '0')),
    paymentOption: String(formData.get('paymentOption') ?? 'cash-on-site') as PaymentOption,
  });
  if (res.ok) {
    redirect(`/agm-2026/receipt/${res.code}`);
  }
  redirect(`/agm-2026?error=${encodeURIComponent(res.message)}`);
}

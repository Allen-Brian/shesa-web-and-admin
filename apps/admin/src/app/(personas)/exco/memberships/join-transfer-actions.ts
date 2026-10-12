'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

import type { ActionResult } from './action-types';

/**
 * Requests + transfers — every action here delegates to an Edge
 * Function (ADR-0033 rule). The Server Action layer's only job is to
 * translate the invoke error into a user-facing toast message.
 */

export async function approveJoinRequest(membershipId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('memberships/approve-join-request', {
    body: { membershipId },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not approve.') };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

export async function rejectJoinRequest(membershipId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('memberships/reject-join-request', {
    body: { membershipId },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not reject.') };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

export async function approveTransfer(transferId: string): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('memberships/approve-transfer', {
    body: { transferId },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not approve transfer.') };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

export async function requestTransfer(input: {
  memberId: string;
  sourceScopeId: string;
  destinationScopeId: string;
  reason?: string;
}): Promise<ActionResult> {
  const supabase = await getServerClient();
  const { error } = await supabase.functions.invoke('memberships/request-transfer', {
    body: input,
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not create transfer request.'),
    };
  }
  revalidatePath('/exco/memberships', 'layout');
  return { ok: true };
}

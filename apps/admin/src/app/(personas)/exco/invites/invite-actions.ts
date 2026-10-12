'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

export type ResendInviteResult =
  | { ok: true; memberId: string; message?: string }
  | { ok: false; memberId: string; message: string };

/**
 * Resends an invite for a single member. Thin wrapper over
 * `members/send-invite` — Edge Function does the auth policy check,
 * the Auth admin API call, and the `member_accounts` upsert.
 */
export async function resendInvite(memberId: string): Promise<ResendInviteResult> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('members/send-invite', {
    body: { memberId },
  });
  if (error) {
    return {
      ok: false,
      memberId,
      message: await extractInvokeMessage(error, 'Could not resend the invite.'),
    };
  }
  const body = data as { isResend?: boolean; claimStatus?: string; resentCount?: number };
  revalidatePath('/exco/invites');
  return {
    ok: true,
    memberId,
    message:
      body?.claimStatus === 'claimed' ? 'Member has already claimed their account.' : undefined,
  };
}

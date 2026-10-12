'use server';

import { revalidatePath } from 'next/cache';

import { extractInvokeMessage } from '@/lib/edge-invoke';
import { getServerClient } from '@/lib/supabase-server';

import type {
  CreateBatchMemberInput,
  CreateBatchMemberResult,
  DeleteBatchMemberResult,
} from './batch-member-types';

/**
 * Commit every valid row in the import batch as a real `core.members`
 * record. Idempotent per the Edge Function's `WHERE status = 'validated'`
 * guard. Per the 2026-07-05 lock, importing members ALSO sends an
 * invite to every created member whose row has an email; per-row
 * failures are counted but don't fail the overall confirm.
 */
export async function confirmMemberImport(input: { batchId: string; batchSlug: string }): Promise<
  | {
      ok: true;
      createdRows: number;
      invitesSent: number;
      invitesFailed: number;
      invitesSkipped: number;
    }
  | { ok: false; message: string }
> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('imports/confirm-member-import', {
    body: { batchId: input.batchId },
  });
  if (error) {
    return {
      ok: false,
      message: await extractInvokeMessage(error, 'Could not commit the import.'),
    };
  }
  const createdRows = (data as { createdRows?: number } | null)?.createdRows ?? 0;

  let invitesSent = 0;
  let invitesFailed = 0;
  let invitesSkipped = 0;

  if (createdRows > 0) {
    const { data: importRows } = await supabase
      .schema('core')
      .from('import_rows')
      .select('created_member_id')
      .eq('import_batch_id', input.batchId)
      .not('created_member_id', 'is', null);
    const memberIds = (importRows ?? [])
      .map((r) => r.created_member_id)
      .filter((id): id is string => !!id);

    if (memberIds.length > 0) {
      const { data: createdMembers } = await supabase
        .schema('core')
        .from('members')
        .select('id, email')
        .in('id', memberIds);

      const results = await Promise.all(
        (createdMembers ?? []).map(async (m) => {
          if (!m.email) return { skipped: true } as const;
          const { error: inviteErr } = await supabase.functions.invoke('members/send-invite', {
            body: { memberId: m.id },
          });
          if (inviteErr) {
            console.error('confirmMemberImport: send-invite failed', {
              memberId: m.id,
              error: inviteErr.message,
            });
            return { failed: true } as const;
          }
          return { sent: true } as const;
        }),
      );
      for (const r of results) {
        if ('sent' in r) invitesSent += 1;
        else if ('failed' in r) invitesFailed += 1;
        else if ('skipped' in r) invitesSkipped += 1;
      }
    }
  }

  revalidatePath(`/exco/clusters/batches/${input.batchSlug}`);
  if (createdRows > 0) revalidatePath('/exco/invites');
  return { ok: true, createdRows, invitesSent, invitesFailed, invitesSkipped };
}

/**
 * Create a single member in the given batch and dispatch the account
 * claim invite when an email is on file. Invite failure is logged but
 * never fails the create — the member row lands, admin can resend from
 * Invites later.
 */
export async function createBatchMember(
  input: CreateBatchMemberInput,
): Promise<CreateBatchMemberResult> {
  const supabase = await getServerClient();
  const { data, error } = await supabase.functions.invoke('members/create-member', {
    body: {
      fullName: input.fullName,
      displayName: input.displayName,
      email: input.email,
      phone: input.phone,
      batchScopeId: input.batchScopeId,
      houseScopeId: input.houseScopeId,
      networkScopeId: input.networkScopeId,
      entryYear: input.entryYear,
      exitYear: input.exitYear,
      currentCountry: input.currentCountry,
      currentRegionState: input.currentRegionState,
      currentCity: input.currentCity,
    },
  });
  if (error) {
    return { ok: false, message: await extractInvokeMessage(error, 'Could not create member.') };
  }
  const memberId = (data as { memberId?: string } | null)?.memberId ?? null;
  if (!memberId) {
    return { ok: false, message: 'Create succeeded but returned no member id.' };
  }

  let inviteSent = false;
  if (input.email) {
    const { error: inviteErr } = await supabase.functions.invoke('members/send-invite', {
      body: { memberId },
    });
    if (inviteErr) {
      console.error('createBatchMember: send-invite failed', {
        memberId,
        error: inviteErr.message,
      });
    } else {
      inviteSent = true;
    }
  }

  revalidatePath(`/exco/clusters/batches/${input.batchSlug}`);
  if (inviteSent) revalidatePath('/exco/invites');
  return { ok: true, memberId, inviteSent };
}

/**
 * Delete a member row entirely. Guard: refuses if the member currently
 * holds an active or passive membership at a branch or autonomous
 * chapter — those relationships have to be closed first before the
 * member row can be deleted.
 *
 * Runs under the caller's JWT. RLS on `core.members` restricts DELETE
 * to admins with `member.manage`; this action is a thin glue over that.
 */
export async function deleteBatchMember(input: {
  readonly memberId: string;
  readonly batchSlug: string;
}): Promise<DeleteBatchMemberResult> {
  const supabase = await getServerClient();

  const { data: activeMemberships } = await supabase
    .schema('core')
    .from('memberships')
    .select('id, scope_id, membership_status')
    .eq('member_id', input.memberId)
    .in('membership_status', ['active', 'passive'])
    .limit(1);

  if ((activeMemberships ?? []).length > 0) {
    return {
      ok: false,
      memberId: input.memberId,
      message:
        'Member is still attached to a branch. Close the membership there before deleting the member row.',
    };
  }

  const { error } = await supabase.schema('core').from('members').delete().eq('id', input.memberId);

  if (error) {
    return { ok: false, memberId: input.memberId, message: error.message };
  }
  revalidatePath(`/exco/clusters/batches/${input.batchSlug}`);
  return { ok: true, memberId: input.memberId };
}

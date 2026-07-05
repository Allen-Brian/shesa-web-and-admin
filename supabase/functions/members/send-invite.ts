/**
 * Edge Function: members/send-invite
 *
 * Sends (or resends) a login-account invite to a member via Supabase
 * Auth's admin invite endpoint. The member must have an email on file.
 *
 * Flow:
 *   1. Authorize the caller — needs `member.import` at the member's
 *      batch scope (or globally via NULL-scope grant).
 *   2. Load the member row; bail with 422 if email is missing.
 *   3. Call `supabase.auth.admin.inviteUserByEmail(email)` with the
 *      service-role client. This creates an auth.users row (if none
 *      exists) and dispatches the magic-link email.
 *   4. Upsert `core.member_accounts`:
 *        - First-time invite: insert with claim_status='invited',
 *          invited_at=NOW(), last_invitation_sent_at=NOW().
 *        - Resend: update last_invitation_sent_at + increment
 *          resent_count. Do not overwrite claim_status if the user
 *          has already claimed.
 *   5. Log an audit event `member.invited` (or `member.invite_resent`).
 *
 * Idempotency:
 *   - Calling repeatedly for the same email is safe — the admin API
 *     returns the existing user row and re-issues the magic link.
 *   - `resent_count` tracks how many times we've dispatched.
 *
 * Failure modes captured in `member_accounts.invite_error`:
 *   - "email already registered" (existing auth user with a different
 *     member_id claim)
 *   - Rate limit
 *   - Malformed email (validation catches most)
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  forbidden,
  internalError,
  notFound,
  success,
  unauthorized,
  validationError,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    memberId: z.string().uuid(),
    /** Optional post-accept redirect URL. Defaults to the admin origin. */
    redirectTo: z.string().url().optional(),
  })
  .strict();

interface SuccessBody {
  memberId: string;
  authUserId: string | null;
  claimStatus: 'invited' | 'claimed';
  resentCount: number;
  isResend: boolean;
  traceId: string;
}

export async function sendInvite(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  // ── Load the member ────────────────────────────────────────────────
  const { data: memberRow } = await supabase
    .schema('core' as never)
    .from('members' as never)
    .select('id, full_name, email, batch_scope_id')
    .eq('id', input.memberId)
    .maybeSingle();
  if (!memberRow) return withCors(req, notFound('member', ctx.traceId));
  const member = memberRow as {
    id: string;
    full_name: string;
    email: string | null;
    batch_scope_id: string;
  };

  if (!member.email) {
    return withCors(
      req,
      validationError('Member has no email on file — cannot send an invite.', ctx.traceId, {
        memberId: member.id,
      }),
    );
  }

  // ── Policy ─────────────────────────────────────────────────────────
  // `member.import` at the member's batch scope. Branch admin usually
  // has member.import at Mainstream (via branch_admin bundle) — the
  // tree walk in has_permission accepts that.
  const allowed = await authorize(supabase, ctx, {
    action: 'member.import',
    scopeId: member.batch_scope_id,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('member.import', ctx.traceId, { scopeId: member.batch_scope_id }),
    );
  }

  // ── Load existing invite / account row ─────────────────────────────
  // Reads via service-role so RLS doesn't intersect with our own new
  // policy (which requires the caller to hold member.import — they do,
  // but we already verified above, and the service role bypass keeps
  // this function invariant to future policy changes).
  const serviceClient = createServiceRoleClient();

  const { data: existingAccountRow } = await serviceClient
    .schema('core' as never)
    .from('member_accounts' as never)
    .select('id, auth_user_id, claim_status, resent_count, claimed_at')
    .eq('member_id', member.id)
    .maybeSingle();
  const existingAccount = existingAccountRow as {
    id: string;
    auth_user_id: string | null;
    claim_status: 'not_invited' | 'invited' | 'claimed' | 'disabled';
    resent_count: number;
    claimed_at: string | null;
  } | null;

  const isResend = !!existingAccount && existingAccount.claim_status === 'invited';

  // Short-circuit: already claimed. We don't want to bounce a "please
  // set your password" email to someone who's already logged in. The
  // caller sees the success response with claimStatus='claimed'.
  if (existingAccount?.claim_status === 'claimed' && existingAccount.auth_user_id) {
    const body: SuccessBody = {
      memberId: member.id,
      authUserId: existingAccount.auth_user_id,
      claimStatus: 'claimed',
      resentCount: existingAccount.resent_count,
      isResend: false,
      traceId: ctx.traceId,
    };
    return withCors(req, success(body));
  }

  // ── Fire the Auth admin invite ─────────────────────────────────────
  // inviteUserByEmail creates or refreshes the auth.users row and
  // sends the magic-link email. The response includes the auth user id.
  const inviteRes = await serviceClient.auth.admin.inviteUserByEmail(member.email, {
    data: { member_id: member.id, full_name: member.full_name },
    redirectTo: input.redirectTo,
  });

  if (inviteRes.error) {
    // Persist the error message on the account row so operators see it
    // in the Invites page without having to hunt through logs.
    if (existingAccount) {
      await serviceClient
        .schema('core' as never)
        .from('member_accounts' as never)
        .update({ invite_error: inviteRes.error.message })
        .eq('id', existingAccount.id);
    } else {
      await serviceClient
        .schema('core' as never)
        .from('member_accounts' as never)
        .insert({
          member_id: member.id,
          claim_status: 'not_invited',
          invite_error: inviteRes.error.message,
        });
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'send-invite: Auth admin invite failed',
        error: inviteRes.error.message,
        memberId: member.id,
      }),
    );
    return withCors(
      req,
      validationError(inviteRes.error.message, ctx.traceId, { memberId: member.id }),
    );
  }

  const authUserId = inviteRes.data.user?.id ?? null;
  if (!authUserId) {
    return withCors(req, internalError(ctx.traceId));
  }

  // ── Upsert the member_accounts row ─────────────────────────────────
  const nowIso = new Date().toISOString();
  let resentCount = 0;

  if (existingAccount) {
    resentCount = isResend ? existingAccount.resent_count + 1 : existingAccount.resent_count;
    const { error } = await serviceClient
      .schema('core' as never)
      .from('member_accounts' as never)
      .update({
        auth_user_id: authUserId,
        claim_status: 'invited',
        invited_at: nowIso,
        last_invitation_sent_at: nowIso,
        resent_count: resentCount,
        invite_error: null,
      })
      .eq('id', existingAccount.id);
    if (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'send-invite: member_accounts UPDATE failed',
          error: error.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
  } else {
    const { error } = await serviceClient
      .schema('core' as never)
      .from('member_accounts' as never)
      .insert({
        member_id: member.id,
        auth_user_id: authUserId,
        claim_status: 'invited',
        invited_at: nowIso,
        last_invitation_sent_at: nowIso,
        resent_count: 0,
      });
    if (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'send-invite: member_accounts INSERT failed',
          error: error.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
  }

  // ── Audit ──────────────────────────────────────────────────────────
  await logEvent(supabase, ctx, {
    action: isResend ? 'member.invite_resent' : 'member.invited',
    entitySchema: 'core',
    entityTable: 'member_accounts',
    entityId: existingAccount?.id ?? null,
    scopeId: member.batch_scope_id,
    metadata: {
      memberId: member.id,
      email: member.email,
      authUserId,
      resentCount,
    },
  });

  const body: SuccessBody = {
    memberId: member.id,
    authUserId,
    claimStatus: 'invited',
    resentCount,
    isResend,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body, isResend ? 200 : 201));
}

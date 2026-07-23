/**
 * Action: groups/create
 *
 * POST /functions/v1/groups/create — creates an event group. Groups
 * are mainstream-only lenses (finance.groups.scope_id is enforced =
 * mainstream by a DB trigger). Same request also seeds the group's
 * default donation campaign (finance.charges with shape='donation',
 * same name as the group, group_id set) so operators have one
 * obvious "donate to this event" destination without a manual
 * follow-up step.
 *
 * Auth: group.manage at the mainstream scope.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  conflict,
  forbidden,
  internalError,
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
    slug: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, {
        message: 'slug must be lowercase alphanumerics with hyphens',
      }),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    startsOn: z.string().date().nullable().optional(),
    endsOn: z.string().date().nullable().optional(),
    showInSidebar: z.boolean().optional().default(true),
  })
  .strict();

interface MainstreamScope {
  readonly id: string;
  readonly currency_code: string;
}

interface SuccessBody {
  readonly id: string;
  readonly slug: string;
  readonly donationCampaignId: string;
  readonly traceId: string;
}

export async function createGroup(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  // 1) Resolve mainstream scope — every group hangs there.
  const { data: mainstreamRow, error: msErr } = await serviceClient
    .schema('core' as never)
    .from('scopes' as never)
    .select('id, currency_code')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (msErr || !mainstreamRow) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'groups/create: mainstream scope lookup failed',
        error: msErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  const mainstream = mainstreamRow as MainstreamScope;

  // 2) Authorize at the mainstream scope.
  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'group.manage',
    scopeId: mainstream.id,
  });
  if (!allowed) {
    return withCors(req, forbidden('group.manage', ctx.traceId, { scopeId: mainstream.id }));
  }

  // 3) Cross-field date invariant. DB CHECK would also catch this;
  //    surfacing it here gives the client a friendlier 422.
  if (input.startsOn && input.endsOn && new Date(input.endsOn) < new Date(input.startsOn)) {
    return withCors(
      req,
      validationError('endsOn must be on or after startsOn.', ctx.traceId, {
        field: 'endsOn',
      }),
    );
  }

  // 4) Slug uniqueness check before insert (nicer error than 23505).
  const { data: existing } = await serviceClient
    .schema('finance' as never)
    .from('groups' as never)
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle();
  if (existing) {
    return withCors(req, conflict('slug already in use', ctx.traceId, { slug: input.slug }));
  }

  // 5) Insert the group.
  const { data: groupRow, error: groupErr } = await serviceClient
    .schema('finance' as never)
    .from('groups' as never)
    .insert({
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      starts_on: input.startsOn ?? null,
      ends_on: input.endsOn ?? null,
      status: 'active',
      show_in_sidebar: input.showInSidebar ?? true,
      scope_id: mainstream.id,
      created_by: ctx.userId,
    } as never)
    .select('id')
    .maybeSingle();
  if (groupErr || !groupRow) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'groups/create: insert failed',
        code: groupErr?.code,
        error: groupErr?.message,
      }),
    );
    if (groupErr?.code === '23505') {
      return withCors(req, conflict('slug already in use', ctx.traceId, { slug: input.slug }));
    }
    if (groupErr?.code === '23514') {
      return withCors(req, validationError(groupErr.message, ctx.traceId));
    }
    return withCors(req, internalError(ctx.traceId));
  }
  const groupId = (groupRow as { id: string }).id;

  // 6) Seed the default donation campaign. Same name as the group;
  //    lifecycle='open' so it's ready to accept donations immediately.
  //    If this fails we roll back the group so a group never ships
  //    without its default campaign — the whole point of this action.
  const { data: campaignRow, error: campaignErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .insert({
      scope_id: mainstream.id,
      shape: 'donation',
      name: input.name,
      description: input.description ?? null,
      currency: mainstream.currency_code,
      recurrence: 'one_time',
      recurrence_interval: 1,
      target_filter: {},
      target_party_type: null,
      lifecycle: 'open',
      status: 'active',
      group_id: groupId,
      open_date: input.startsOn ? new Date(input.startsOn).toISOString() : null,
      close_date: input.endsOn ? new Date(input.endsOn).toISOString() : null,
      created_by: ctx.userId,
    } as never)
    .select('id')
    .maybeSingle();
  if (campaignErr || !campaignRow) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'groups/create: default donation campaign insert failed — rolling back group',
        groupId,
        code: campaignErr?.code,
        error: campaignErr?.message,
      }),
    );
    await serviceClient
      .schema('finance' as never)
      .from('groups' as never)
      .delete()
      .eq('id', groupId);
    return withCors(req, internalError(ctx.traceId));
  }
  const donationCampaignId = (campaignRow as { id: string }).id;

  await logEvent(serviceClient, ctx, {
    action: 'group.created',
    entitySchema: 'finance',
    entityTable: 'groups',
    entityId: groupId,
    scopeId: mainstream.id,
    metadata: {
      slug: input.slug,
      name: input.name,
      defaultDonationCampaignId: donationCampaignId,
    },
  });

  const body: SuccessBody = {
    id: groupId,
    slug: input.slug,
    donationCampaignId,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body, 201));
}

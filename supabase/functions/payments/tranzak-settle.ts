/**
 * Action: payments/tranzak-settle
 *
 * Settles a Tranzak transaction. Reached two ways, both of which supply
 * nothing but an identifier:
 *
 *   · The webhook, forwarded by `apps/web`'s `/tranzak/webhook` route.
 *   · The payer's return page, once they come back from checkout.
 *
 * ─── Why the `authKey` check is here and what it is not ────────────────
 * Tranzak's notification carries no signature — verification is a static
 * `authKey` echoed inside the body. It cannot authenticate the *content*
 * of a notification, because anyone who has seen one body has the key and
 * can put any status they like next to it.
 *
 * It is still worth checking, for a different reason: without it, an open
 * endpoint lets anyone make us issue outbound `request/details` calls at
 * will and burn our Tranzak quota. So it gates the outbound call, and the
 * authenticated re-read gates the settlement. Two different jobs.
 *
 * The return path has no `authKey` and does not need one — it names an
 * intent we already own, and the re-read decides everything anyway.
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { internalError, success } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { authKeyMatches, resolveTranzakConfig } from '../_shared/tranzak-config.ts';
import { settleFromIntentId, settleFromRequestId } from '../_shared/tranzak-settle.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    /** Gateway request id — the webhook path. */
    requestId: z.string().min(1).max(200).optional(),
    /** Our own intent id — the payer-return path. */
    intentId: z.string().uuid().optional(),
    /** Present only on the webhook path. */
    authKey: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => !!v.requestId !== !!v.intentId, {
    message: 'Supply exactly one of requestId or intentId.',
    path: ['requestId'],
  });

export async function tranzakSettle(req: Request): Promise<Response> {
  const ctx = await buildContext(req);

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  let config;
  try {
    config = resolveTranzakConfig();
  } catch (err) {
    // A misconfiguration, not a caller error. Loud, and never leaks which
    // setting is wrong to whoever is on the other end.
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        component: 'payments.tranzak-settle',
        message: 'tranzak configuration invalid',
        error: String(err),
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  // Gate the outbound call on the webhook path.
  if (input.requestId) {
    const provided = input.authKey ?? '';
    if (!(await authKeyMatches(provided, config.webhookAuthKey))) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          traceId: ctx.traceId,
          component: 'payments.tranzak-settle',
          message: 'webhook rejected: authKey did not match',
          requestId: input.requestId,
        }),
      );
      // 202 rather than 401 on purpose. A gateway that sees an error
      // retries, and a caller probing the key learns nothing from a
      // uniform response. Nothing was settled either way.
      return withCors(req, success({ outcome: 'ignored', traceId: ctx.traceId }));
    }
  }

  try {
    const result = input.requestId
      ? await settleFromRequestId(input.requestId)
      : await settleFromIntentId(input.intentId!);

    return withCors(req, success({ ...result, traceId: ctx.traceId }));
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        component: 'payments.tranzak-settle',
        message: 'settlement failed',
        requestId: input.requestId,
        intentId: input.intentId,
        error: String(err),
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
}

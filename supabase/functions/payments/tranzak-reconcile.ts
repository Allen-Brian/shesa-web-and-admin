/**
 * Action: payments/tranzak-reconcile
 *
 * Sweeps intents that never reached a terminal state and asks Tranzak
 * what actually happened to each.
 *
 * ─── Why this exists ───────────────────────────────────────────────────
 * Settlement had two paths and both are things that *might* happen:
 *
 *   · The payer's browser returning to the receipt page, which settles.
 *   · Tranzak's webhook, which is a notification nobody can guarantee.
 *
 * On 2026-09-16 a payer paid 20,000 XAF by MTN Momo at 17:44:33 and never
 * came back to the site. The webhook did not settle it either. The intent
 * sat at `pending` for two days while the money was in the account, and it
 * only came to light because someone noticed the dashboard was short —
 * then recorded it by hand, which produced a payment with no payer on it.
 *
 * Nothing in the system was looking. This is the thing that looks.
 *
 * It is deliberately a third path rather than a fix to either of the other
 * two, because both of them depend on something outside our control
 * happening at all. A poll depends only on us running it.
 *
 * ─── Why it is safe to run repeatedly ──────────────────────────────────
 * `settleFromIntentId` is idempotent: an intent already terminal answers
 * from itself without calling the gateway, and the settlement write is
 * guarded by a unique index on (provider, provider_ref) so a double
 * settle collides rather than duplicating. Re-running this sweep cannot
 * pay anyone twice.
 *
 * It also fixes the other half of the problem: an intent whose gateway
 * request FAILED stays `pending` in our books forever, because nothing
 * ever went back to ask. `settleFromIntentId` maps FAILED and CANCELLED
 * onto the intent, so a sweep closes those too.
 *
 * ─── Auth ──────────────────────────────────────────────────────────────
 * `TRANZAK_RECONCILE_SECRET` in an `x-worker-secret` header, the same
 * gate the notification consumers use, for the same reason: `verify_jwt`
 * is a signature check and the anon key is a valid project JWT, so
 * without the header this would be an open endpoint that makes us issue
 * unbounded outbound `request/details` calls.
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import { internalError, success, unauthorized } from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { resolveTranzakConfig } from '../_shared/tranzak-config.ts';
import { settleFromIntentId } from '../_shared/tranzak-settle.ts';
import { parseJson } from '../_shared/validation.ts';
import { checkWorkerSecret } from '../_shared/worker-auth.ts';

/**
 * How far back to look.
 *
 * Tranzak keeps `mchTransactionRef` unique for 30 days, which is the
 * outer bound on a reference still meaning anything. Seven days is well
 * inside that and keeps each sweep small; anything older than a week that
 * is still pending is not going to resolve itself and wants a human.
 */
const DEFAULT_LOOKBACK_HOURS = 24 * 7;

/**
 * Bounded so one sweep cannot run for minutes or hammer the gateway.
 * Whatever is left is picked up by the next run a few minutes later.
 */
const DEFAULT_LIMIT = 40;

const inputSchema = z
  .object({
    lookbackHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .optional(),
    limit: z.number().int().min(1).max(200).optional(),
    /** Report what would be done without asking the gateway anything. */
    dryRun: z.boolean().optional(),
  })
  .strict();

interface PendingIntent {
  readonly id: string;
  readonly amount: number;
  readonly payer_name: string | null;
  readonly created_at: string;
  readonly metadata: Record<string, unknown> | null;
}

export async function tranzakReconcile(req: Request): Promise<Response> {
  const ctx = await buildContext(req);

  const auth = await checkWorkerSecret(req, 'TRANZAK_RECONCILE_SECRET');
  if (!auth.ok) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        traceId: ctx.traceId,
        component: 'payments.tranzak-reconcile',
        message: 'rejected',
        reason: auth.reason,
      }),
    );
    return withCors(req, unauthorized(ctx.traceId));
  }

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  let config;
  try {
    config = resolveTranzakConfig();
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        component: 'payments.tranzak-reconcile',
        message: 'tranzak configuration invalid',
        error: String(err),
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const lookbackHours = input.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
  const since = new Date(Date.now() - lookbackHours * 3600_000).toISOString();

  // Only this mode's intents. A sandbox sweep must never ask the live API
  // about a reference it does not have, and vice versa — the credentials
  // differ and the lookup would simply fail.
  const service = createServiceRoleClient();
  const { data, error } = await service
    .schema('finance' as never)
    .from('payment_intents' as never)
    .select('id, amount, payer_name, created_at, metadata')
    .eq('mode', config.mode)
    .in('status', ['initiated', 'pending'])
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(input.limit ?? DEFAULT_LIMIT);

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        component: 'payments.tranzak-reconcile',
        message: 'could not list intents',
        error: error.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const intents = (data ?? []) as PendingIntent[];

  // An intent with no gateway reference never reached Tranzak, so there is
  // nothing to ask about. Skipped here rather than inside the settle call,
  // to keep the counts honest about what was actually polled.
  const pollable = intents.filter((i) => typeof (i.metadata ?? {})['provider_ref'] === 'string');

  if (input.dryRun) {
    return withCors(
      req,
      success({
        mode: config.mode,
        dryRun: true,
        found: intents.length,
        pollable: pollable.length,
        intents: pollable.map((i) => ({
          intentId: i.id,
          amount: i.amount,
          payerName: i.payer_name,
          createdAt: i.created_at,
          requestId: (i.metadata ?? {})['provider_ref'],
        })),
        traceId: ctx.traceId,
      }),
    );
  }

  const tally: Record<string, number> = {};
  const settled: unknown[] = [];

  // Sequential, not Promise.all. Each iteration is an outbound call to the
  // gateway, and forty at once is a burst we have no reason to create —
  // nobody is waiting on this response.
  for (const intent of pollable) {
    try {
      const result = await settleFromIntentId(intent.id);
      tally[result.outcome] = (tally[result.outcome] ?? 0) + 1;

      if (result.outcome === 'settled') {
        // Loud on purpose. Every line here is money that was in the
        // account and not in the books until this ran.
        console.log(
          JSON.stringify({
            level: 'info',
            traceId: ctx.traceId,
            component: 'payments.tranzak-reconcile',
            message: 'settled an intent nothing else caught',
            intentId: intent.id,
            amount: intent.amount,
            payerName: intent.payer_name,
            createdAt: intent.created_at,
            settlementId: result.settlementId,
          }),
        );
        settled.push({
          intentId: intent.id,
          amount: intent.amount,
          payerName: intent.payer_name,
          settlementId: result.settlementId,
        });
      }
    } catch (err) {
      // One bad reference must not stop the sweep: the next intent in the
      // list may be the one holding real money.
      tally['error'] = (tally['error'] ?? 0) + 1;
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          component: 'payments.tranzak-reconcile',
          message: 'intent failed to reconcile',
          intentId: intent.id,
          error: String(err),
        }),
      );
    }
  }

  return withCors(
    req,
    success({
      mode: config.mode,
      found: intents.length,
      polled: pollable.length,
      outcomes: tally,
      settled,
      traceId: ctx.traceId,
    }),
  );
}

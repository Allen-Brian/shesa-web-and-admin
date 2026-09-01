import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { PendingView } from './widgets/pending-view';

export const dynamic = 'force-dynamic';

interface Params {
  readonly intentId: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface IntentSnapshot {
  readonly status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired';
  readonly receiptToken: string | null;
  readonly hostedLink: string | null;
  readonly failureReason: string | null;
}

/**
 * Server-side initial fetch. We hit the SECURITY DEFINER RPC directly
 * (bypassing RLS via service role) so the page renders on first paint
 * with whatever state the intent is in — no client-side flicker before
 * the first poll response lands.
 */
async function loadIntent(intentId: string): Promise<IntentSnapshot | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .schema('finance' as never)
    .rpc('get_public_intent_status' as never, { p_intent_id: intentId } as never);
  const rows = data as Array<{
    status: IntentSnapshot['status'];
    receipt_token: string | null;
    hosted_link: string | null;
    failure_reason: string | null;
  }> | null;
  const first = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!first) return null;
  return {
    status: first.status,
    receiptToken: first.receipt_token,
    hostedLink: first.hosted_link,
    failureReason: first.failure_reason,
  };
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { intentId } = await params;
  return { title: `AGM 2026 · Confirming payment · ${intentId.slice(0, 8)} · SHESA` };
}

export default async function PendingPage({ params }: { readonly params: Promise<Params> }) {
  const { intentId } = await params;
  if (!UUID_RE.test(intentId)) notFound();

  const initial = await loadIntent(intentId);
  if (!initial) notFound();

  // If the intent is already terminal server-side, skip the polling
  // widget: for succeeded we redirect immediately below (via <meta>),
  // for other terminals the widget renders the retry state without
  // ever kicking off a poll loop.
  return (
    <main className="relative min-h-screen bg-white">
      <PendingView intentId={intentId} initial={initial} />
    </main>
  );
}

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { clientEnv } from '@shesa/config/env.client';

import { Logo } from '@shesa/ui';

import { AGM_META } from '@/components/agm/data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];
const POLL_INTERVAL_MS = 3_000;
const LONG_WAIT_THRESHOLD_MS = 90_000;

export type IntentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'expired';

export interface PendingViewProps {
  readonly intentId: string;
  readonly initial: {
    readonly status: IntentStatus;
    readonly receiptToken: string | null;
    readonly hostedLink: string | null;
    readonly failureReason: string | null;
  };
}

interface PollResponse {
  readonly status: IntentStatus;
  readonly receiptToken: string | null;
  readonly hostedLink: string | null;
  readonly failureReason: string | null;
}

/**
 * The pending-state page shown after the payer returns from Fapshi's
 * hosted checkout. Fapshi's server-to-server webhook may land within
 * seconds; the reconcile cron is the fallback. This view polls the
 * fapshi/status edge function until the intent moves off `pending`,
 * then either redirects to the receipt (which serves as the thank-you)
 * or renders a retry state.
 *
 * After LONG_WAIT_THRESHOLD_MS with no transition we stop polling and
 * tell the payer we'll email them the receipt — the reconcile cron
 * will still finalise the intent asynchronously.
 */
export function PendingView({ intentId, initial }: PendingViewProps) {
  const router = useRouter();
  const [state, setState] = useState<PollResponse>(initial);
  const [waitedLong, setWaitedLong] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (state.status !== 'pending') return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;
      try {
        const url = `${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fapshi/status?intentId=${encodeURIComponent(intentId)}`;
        const res = await fetch(url, {
          headers: {
            apikey: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          },
          cache: 'no-store',
        });
        if (res.ok) {
          const body = (await res.json()) as PollResponse;
          if (!cancelled) setState(body);
        }
      } catch {
        // network hiccup — ignore, next tick will retry
      }
      if (!cancelled) {
        if (Date.now() - startedAt.current > LONG_WAIT_THRESHOLD_MS) {
          setWaitedLong(true);
          return; // stop polling; reconcile cron will finish it
        }
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    timer = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [intentId, state.status]);

  useEffect(() => {
    if (state.status === 'succeeded' && state.receiptToken) {
      router.push(`/agm-2026/receipt/${state.receiptToken}`);
    }
  }, [state.status, state.receiptToken, router]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-5 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease }}
        className="flex flex-col items-center gap-6"
      >
        <div className="grid h-24 w-24 place-items-center rounded-full border border-black/10 bg-white">
          <Logo size={72} />
        </div>
        <p className="font-heading text-[11px] uppercase tracking-[0.28em] text-black/50">
          AGM {AGM_META.edition}
        </p>

        {state.status === 'pending' && !waitedLong && <PendingContent />}
        {state.status === 'pending' && waitedLong && <LongWaitContent />}
        {state.status === 'succeeded' && <SucceededContent />}
        {(state.status === 'failed' || state.status === 'cancelled') && (
          <FailedContent reason={state.failureReason} hostedLink={state.hostedLink} />
        )}
        {state.status === 'expired' && <ExpiredContent />}
      </motion.div>
    </div>
  );
}

function PendingContent() {
  return (
    <>
      <h1 className="font-heading text-3xl font-light text-black md:text-4xl">
        Confirming your payment…
      </h1>
      <p className="max-w-md text-[15px] leading-relaxed text-black/60">
        We're waiting on Fapshi to confirm the transaction. This usually takes a few seconds. Keep
        this page open — we'll take you to your receipt automatically.
      </p>
      <div className="flex items-center gap-3">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
        <span className="text-[13px] uppercase tracking-[0.24em] text-black/50">Listening…</span>
      </div>
    </>
  );
}

function LongWaitContent() {
  return (
    <>
      <h1 className="font-heading text-3xl font-light text-black md:text-4xl">
        Still confirming your payment
      </h1>
      <p className="max-w-md text-[15px] leading-relaxed text-black/60">
        Your payment is taking longer than usual to confirm — this happens when the mobile-money
        network is slow. It's safe to close this page; we'll email your receipt as soon as we hear
        back. If you'd like, refresh in a couple of minutes.
      </p>
      <Link
        href="/agm-2026"
        className="mt-2 inline-flex items-center gap-2 rounded-xs bg-black px-6 py-3 text-sm font-medium tracking-wide text-white hover:bg-primary"
      >
        Back to AGM 2026
      </Link>
    </>
  );
}

function SucceededContent() {
  return (
    <>
      <h1 className="font-heading text-3xl font-light text-black md:text-4xl">Payment confirmed</h1>
      <p className="text-[15px] text-black/60">Taking you to your receipt…</p>
    </>
  );
}

function FailedContent({
  reason,
  hostedLink,
}: {
  readonly reason: string | null;
  readonly hostedLink: string | null;
}) {
  return (
    <>
      <h1 className="font-heading text-3xl font-light text-black md:text-4xl">
        We couldn't confirm the payment
      </h1>
      <p className="max-w-md text-[15px] leading-relaxed text-black/60">
        {reason
          ? `Fapshi returned: ${reason}. No money was moved.`
          : 'The payment did not go through. No money was moved. You can try again.'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {hostedLink && (
          <a
            href={hostedLink}
            className="inline-flex items-center gap-2 rounded-xs border border-black/20 bg-white px-6 py-3 text-sm font-medium tracking-wide text-black hover:border-black/40"
          >
            Try this payment link again
          </a>
        )}
        <Link
          href="/agm-2026"
          className="inline-flex items-center gap-2 rounded-xs bg-black px-6 py-3 text-sm font-medium tracking-wide text-white hover:bg-primary"
        >
          Start over
        </Link>
      </div>
    </>
  );
}

function ExpiredContent() {
  return (
    <>
      <h1 className="font-heading text-3xl font-light text-black md:text-4xl">
        Payment window closed
      </h1>
      <p className="max-w-md text-[15px] leading-relaxed text-black/60">
        This payment link has expired. No money was moved. Please start a new payment.
      </p>
      <Link
        href="/agm-2026"
        className="inline-flex items-center gap-2 rounded-xs bg-black px-6 py-3 text-sm font-medium tracking-wide text-white hover:bg-primary"
      >
        Start over
      </Link>
    </>
  );
}

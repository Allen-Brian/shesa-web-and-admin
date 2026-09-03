'use client';

import { motion } from 'framer-motion';

import { Logo } from '@shesa/ui';

import { AGM_META } from './agm-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * Charge kinds the AGM receipt can render. Drives header copy +
 * status label so a Ticket, an Attire order, or a Funding donation
 * each get language that matches what the visitor actually bought.
 */
export type AgmReceiptKind = 'ticket' | 'attire' | 'donation' | 'other';

export interface AgmReceiptData {
  readonly kind: AgmReceiptKind;
  readonly chargeName: string;
  readonly receiptNumber: string;
  readonly payerName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly createdAt: string;
  /** Payment metadata surfaces buyer-supplied context (measurements, tier). */
  readonly metadata: Record<string, unknown>;
  /**
   * True for a sandbox settlement. Renders the same receipt with a
   * watermark and a banner, because seeing what a real payer sees is the
   * point of a test run — but a screenshot of one must never be passable
   * as proof of payment. No token behind it will ever verify: sandbox
   * settlements mint none.
   */
  readonly isTest?: boolean;
}

interface Props {
  readonly receipt: AgmReceiptData;
  /** Pre-rendered QR SVG. */
  readonly qrSvg: string;
}

function methodLabel(method: string): string {
  switch (method) {
    case 'mtn_momo':
      return 'MTN Mobile Money';
    case 'orange_money':
      return 'Orange Money';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'card':
      return 'Card (Visa / MasterCard)';
    case 'cash':
      return 'Cash on arrival';
    default:
      return method;
  }
}

function formatMoney(value: number): string {
  return Number.isFinite(value) ? Math.round(value).toLocaleString() : String(value);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const KIND_HEADING: Record<AgmReceiptKind, string> = {
  ticket: 'Ticket',
  attire: 'Attire order',
  donation: 'Donation receipt',
  other: 'Receipt',
};

/**
 * The printable receipt card. Header carries the SHESA mark; body
 * lists the buyer details, charge name, amount, method, receipt
 * number; footer holds the QR code + print/back CTAs. The heading
 * label switches by `kind` so a Ticket / Attire / Donation each read
 * naturally.
 */
export function ReceiptCard({ receipt, qrSvg }: Props) {
  const heading = KIND_HEADING[receipt.kind];
  return (
    <div className="relative mx-auto flex max-w-4xl flex-col gap-6 px-5 py-16 md:py-24">
      {receipt.isTest && (
        <>
          {/* Says so in words, for anyone reading. */}
          <div className="rounded-xs border-2 border-dashed border-amber-500 bg-amber-50 px-5 py-3 text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-amber-800">
              Test mode — not a real payment
            </p>
            <p className="mt-1 text-xs text-amber-700">
              This is a sandbox transaction. No money moved, nothing was recorded in the accounts,
              and this document is not a valid receipt.
            </p>
          </div>

          {/* And says so across the page, for anyone screenshotting. The
              watermark survives print, which the banner alone might not. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden"
          >
            <span className="-rotate-[24deg] select-none whitespace-nowrap text-[19vw] font-black uppercase leading-none tracking-tighter text-amber-500/15 md:text-[13rem]">
              Test
            </span>
          </div>
        </>
      )}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <a
          href="/agm-2026"
          className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.24em] text-black/50 hover:text-black"
        >
          <span aria-hidden>←</span> Back to AGM 2026
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xs bg-black px-5 py-2.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-primary"
        >
          Print / Save PDF
          <span aria-hidden>↓</span>
        </button>
      </div>

      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease }}
        id="agm-receipt"
        className="relative overflow-hidden rounded-xs border border-black/12 bg-white shadow-[0_14px_50px_-20px_rgba(0,0,0,0.18)] print:border-black/40 print:shadow-none"
      >
        <header
          className="relative px-8 py-8 text-white md:px-12"
          style={{
            background:
              'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 100%, black 10%) 0%, color-mix(in srgb, var(--color-primary) 65%, black 25%) 100%)',
          }}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <ShesaMark />
              <div>
                <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-white/80">
                  SHESA · Sacred Heart Alumni
                </p>
                <p
                  className="mt-1 font-heading font-thin leading-tight text-white"
                  style={{ fontSize: '1.75rem', letterSpacing: '-0.02em' }}
                >
                  AGM {AGM_META.edition}, {heading}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-[10.5px] font-medium uppercase tracking-[0.24em] text-white/70">
                Receipt №
              </p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-[0.15em] text-white">
                {receipt.receiptNumber}
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 px-8 py-10 md:grid-cols-[1fr_220px] md:px-12">
          <div className="flex flex-col gap-6">
            <ReceiptRow label={receipt.kind === 'donation' ? 'Donor' : 'Buyer'}>
              <span className="font-heading text-2xl font-light text-black">
                {receipt.payerName}
              </span>
            </ReceiptRow>

            <div className="grid gap-6 sm:grid-cols-2">
              {receipt.email && (
                <ReceiptRow label="Email">
                  <span className="text-[14px] text-black/70">{receipt.email}</span>
                </ReceiptRow>
              )}
              {receipt.phone && (
                <ReceiptRow label="Phone">
                  <span className="text-[14px] text-black/70">{receipt.phone}</span>
                </ReceiptRow>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <ReceiptRow label={receipt.kind === 'donation' ? 'Amount donated' : 'Amount'}>
                <span className="font-heading text-2xl font-light tabular-nums text-black">
                  {formatMoney(receipt.amount)}{' '}
                  <span className="text-sm text-black/50">{receipt.currency}</span>
                </span>
              </ReceiptRow>
              <ReceiptRow label="Payment method">
                <span className="text-[14px] text-black/70">{methodLabel(receipt.method)}</span>
              </ReceiptRow>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <ReceiptRow label="Charge">
                <span className="text-[14px] text-black/70">{receipt.chargeName}</span>
              </ReceiptRow>
              <ReceiptRow label="Issued">
                <span className="text-[13px] text-black/60">{formatDate(receipt.createdAt)}</span>
              </ReceiptRow>
            </div>

            {receipt.kind === 'attire' && <AttireSize metadata={receipt.metadata} />}
          </div>

          <div className="flex flex-col items-center gap-3 border-t border-dashed border-black/15 pt-8 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <div
              className="h-44 w-44 shrink-0 rounded-xs border border-black/10 bg-white p-2"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-center text-[10.5px] uppercase tracking-[0.22em] text-black/50">
              Scan at check-in
            </p>
            <p className="text-center font-mono text-[11px] tracking-[0.12em] text-black/70">
              {receipt.receiptNumber}
            </p>
          </div>
        </div>

        <footer className="border-t border-black/10 bg-black/2 px-8 py-6 md:px-12">
          <div className="flex flex-wrap items-baseline justify-between gap-4 text-[12px] text-black/55">
            <p>
              {AGM_META.dates} · {AGM_META.venue}
            </p>
            <p className="uppercase tracking-[0.24em]">shesaconnect.com</p>
          </div>
        </footer>
      </motion.article>

      <p className="text-center text-[12.5px] text-black/50 print:hidden">
        Keep this receipt handy, bring it to the check-in desk (screen or paper is fine).
      </p>
    </div>
  );
}

function ReceiptRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-heading text-[10.5px] font-medium uppercase tracking-[0.24em] text-black/50">
        {label}
      </span>
      {children}
    </div>
  );
}

function AttireSize({ metadata }: { readonly metadata: Record<string, unknown> }) {
  const size = typeof metadata.size === 'string' ? metadata.size : null;
  if (!size) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xs border border-dashed border-black/15 p-4">
      <p className="font-heading text-[10.5px] font-medium uppercase tracking-[0.24em] text-black/50">
        Size
      </p>
      <p className="font-heading text-2xl font-light tracking-[0.16em] text-black">{size}</p>
      <p className="text-[12px] text-black/50">
        Bring this receipt to the pick-up desk on Assembly Day.
      </p>
    </div>
  );
}

function ShesaMark() {
  return (
    <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full border border-white/40 bg-white/10 backdrop-blur-sm">
      <Logo size={81} />
    </span>
  );
}

'use client';

import { motion } from 'framer-motion';

import { AGM_META, PAYMENT_OPTIONS } from './data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface TicketRow {
  readonly code: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly amount_xaf: number | string;
  readonly payment_option: string;
  readonly status: 'issued' | 'paid' | 'cancelled';
  readonly created_at: string;
}

interface Props {
  readonly ticket: TicketRow;
  /** Pre-rendered QR SVG (data-URI or raw SVG markup). */
  readonly qrSvg: string;
}

function paymentLabel(option: string): string {
  return PAYMENT_OPTIONS.find((o) => o.value === option)?.label ?? option;
}

function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString();
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

/**
 * The printable receipt card. Header carries the SHESA mark; body has
 * the ticket-holder details, tier, amount, status; footer holds the
 * QR code + print/back CTAs. Uses `contain-strict` on the card so
 * @media print can target just this element.
 */
export function ReceiptCard({ ticket, qrSvg }: Props) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-16 md:py-24">
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
        {/* Header */}
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
                  AGM {AGM_META.edition} — Yaoundé
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-heading text-[10.5px] font-medium uppercase tracking-[0.24em] text-white/70">
                Ticket
              </p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-[0.15em] text-white">
                {ticket.code}
              </p>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="grid gap-8 px-8 py-10 md:grid-cols-[1fr_220px] md:px-12">
          <div className="flex flex-col gap-6">
            <ReceiptRow label="Attendee">
              <span className="font-heading text-2xl font-light text-black">
                {ticket.full_name}
              </span>
            </ReceiptRow>

            <div className="grid gap-6 sm:grid-cols-2">
              {ticket.email && (
                <ReceiptRow label="Email">
                  <span className="text-[14px] text-black/70">{ticket.email}</span>
                </ReceiptRow>
              )}
              {ticket.phone && (
                <ReceiptRow label="Phone">
                  <span className="text-[14px] text-black/70">{ticket.phone}</span>
                </ReceiptRow>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <ReceiptRow label="Amount">
                <span className="font-heading text-2xl font-light tabular-nums text-black">
                  {formatMoney(ticket.amount_xaf)}{' '}
                  <span className="text-sm text-black/50">XAF</span>
                </span>
              </ReceiptRow>
              <ReceiptRow label="Payment option">
                <span className="text-[14px] text-black/70">
                  {paymentLabel(ticket.payment_option)}
                </span>
              </ReceiptRow>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <ReceiptRow label="Status">
                <StatusBadge status={ticket.status} />
              </ReceiptRow>
              <ReceiptRow label="Issued">
                <span className="text-[13px] text-black/60">{formatDate(ticket.created_at)}</span>
              </ReceiptRow>
            </div>
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
              {ticket.code}
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-black/10 bg-black/[0.02] px-8 py-6 md:px-12">
          <div className="flex flex-wrap items-baseline justify-between gap-4 text-[12px] text-black/55">
            <p>
              {AGM_META.dates} · {AGM_META.venue}
            </p>
            <p className="uppercase tracking-[0.24em]">shesaconnect.com</p>
          </div>
        </footer>
      </motion.article>

      <p className="text-center text-[12.5px] text-black/50 print:hidden">
        Keep this receipt handy — bring it to the check-in desk (screen or paper is fine).
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

function StatusBadge({ status }: { readonly status: 'issued' | 'paid' | 'cancelled' }) {
  const map: Record<
    typeof status,
    { readonly label: string; readonly bg: string; readonly fg: string }
  > = {
    issued: {
      label: 'Issued — awaiting reconciliation',
      bg: 'color-mix(in srgb, var(--color-primary) 12%, white)',
      fg: 'var(--color-primary)',
    },
    paid: { label: 'Paid', bg: '#e5f6ea', fg: '#1c7a3c' },
    cancelled: { label: 'Cancelled', bg: '#f5e5e5', fg: '#8a1a1a' },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex w-fit items-center rounded-xs px-2.5 py-1 font-heading text-[10.5px] font-medium uppercase tracking-[0.22em]"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function ShesaMark() {
  return (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/40 bg-white/10 backdrop-blur-sm">
      <span
        className="font-heading font-thin text-white"
        style={{ fontSize: '1.15rem', letterSpacing: '0.05em' }}
      >
        SH
      </span>
    </span>
  );
}

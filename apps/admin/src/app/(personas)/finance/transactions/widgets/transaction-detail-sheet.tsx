'use client';

import {
  ArrowDownRight,
  BadgeCheck,
  Building2,
  Copy,
  ExternalLink,
  Hash,
  Mail,
  MapPin,
  Phone,
  Receipt as ReceiptIcon,
  RotateCcw,
  StickyNote,
  Target,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  toast,
} from '@shesa/ui';

import { PaymentStateChip, settlementOf } from '@/components/finance/payment-state-chip';
import { formatShortDay, formatTime24 } from '@/lib/format/date-time';

import { formatMethod } from './transactions-helpers';
import type { TransactionRow } from './transactions-types';

interface Props {
  readonly target: TransactionRow | null;
  readonly verifyUrl: string;
  readonly canReverse: boolean;
  readonly alreadyReversed: boolean;
  readonly onClose: () => void;
  readonly onPreviewReceipt: (row: TransactionRow) => void;
  readonly onReverse: (row: TransactionRow) => void;
  readonly onReconcile: (row: TransactionRow) => void;
  readonly onUndoReconciliation: (row: TransactionRow) => void;
}

/**
 * Side sheet that opens when the operator clicks a transaction row.
 *
 * The figure is the reason the sheet is open, so it is given the whole
 * top of the panel on the brand gradient and nothing competes with it.
 * Everything under that is reference material, and is banded into
 * labelled cards with a tinted icon apiece — the operator is usually
 * scanning for one specific field (a phone number, a gateway ref, the
 * reconciliation note), and colour-coded anchors find it faster than a
 * uniform run of grey rows does.
 *
 * The gateway block keeps gross, fee and net apart and tints them by
 * what they mean: the fee is money lost, the net is what the treasury
 * actually received. A payment that reconciles at gross can still leave
 * the books short, and colour is what makes that gap noticeable.
 */
export function TransactionDetailSheet({
  target,
  verifyUrl,
  canReverse,
  alreadyReversed,
  onClose,
  onPreviewReceipt,
  onReverse,
  onReconcile,
  onUndoReconciliation,
}: Props) {
  const copyRef = async () => {
    if (!target?.externalRef) return;
    try {
      await navigator.clipboard.writeText(target.externalRef);
      toast.success('External ref copied.');
    } catch {
      toast.error('Could not copy. Copy manually from the field.');
    }
  };

  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {target && (
          <>
            <SheetHeader className="[background-image:var(--gradient-primary)] px-6 py-6 pr-14 text-white">
              <SheetTitle className="flex flex-col items-start gap-1 text-left">
                <span className="inline-flex items-baseline gap-2 text-[2.1rem] font-semibold leading-none tabular-nums text-white">
                  {target.reversesPaymentId && (
                    <ArrowDownRight className="h-6 w-6 shrink-0 self-center" aria-hidden />
                  )}
                  {new Intl.NumberFormat().format(target.amount)}
                  <span className="text-sm font-medium text-white/70">{target.currency}</span>
                </span>
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/75">
                  {formatMethod(target.method)} · {target.source === 'auto' ? 'Website' : 'Manual'}
                </span>
              </SheetTitle>
              <SheetDescription className="mt-3 flex items-center gap-2 text-left text-xs text-white/80">
                <span>{formatShortDay(target.createdAt) ?? '-'}</span>
                <span className="h-3 w-px bg-white/30" aria-hidden />
                <span className="tabular-nums">{formatTime24(target.createdAt) ?? '-'}</span>
              </SheetDescription>
            </SheetHeader>

            {/* State sits on the page surface rather than on the gradient:
                the chip's own colours are what carry its meaning, and they
                cannot do that over burgundy. */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/40 px-6 py-3">
              <PaymentStateChip
                settlement={settlementOf(!!target.reversesPaymentId, alreadyReversed)}
                reconciled={target.reconciled}
                reconciledAt={target.reconciledAt}
              />
              {target.isAnonymousPayer && (
                <Badge variant="outline" className="border-border bg-card text-muted-foreground">
                  Anonymous
                </Badge>
              )}
              {target.gatewayStatus && (
                <Badge variant="outline" className="border-border bg-card text-muted-foreground">
                  {target.gatewayStatus.replaceAll('_', ' ').toLowerCase()}
                </Badge>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 px-4 py-4">
              <Section icon={Target} tone="primary" title="Paid for">
                <p className="text-sm font-semibold text-foreground">{target.chargeName}</p>
                <p className="text-xs text-muted-foreground">
                  {target.scopeName}
                  {target.chargeShape && ` · ${target.chargeShape}`}
                </p>
              </Section>

              <Section icon={User} tone="sky" title="Payer">
                <p className="text-sm font-semibold text-foreground">{target.payerLabel}</p>
                <div className="mt-1.5 flex flex-col gap-1">
                  {target.payerEmail && (
                    <ContactLine
                      icon={Mail}
                      value={target.payerEmail}
                      href={`mailto:${target.payerEmail}`}
                    />
                  )}
                  {target.payerPhone && (
                    <ContactLine
                      icon={Phone}
                      value={target.payerPhone}
                      href={`tel:${target.payerPhone.replace(/\s+/g, '')}`}
                    />
                  )}
                  {target.payerLocation && (
                    <ContactLine icon={MapPin} value={target.payerLocation} />
                  )}
                  {!target.payerEmail && !target.payerPhone && !target.payerLocation && (
                    <span className="text-xs italic text-muted-foreground">
                      No contact details on record.
                    </span>
                  )}
                </div>
              </Section>

              {target.memo && (
                <Section icon={StickyNote} tone="amber" title="Note">
                  <p className="text-sm leading-relaxed text-foreground">{target.memo}</p>
                </Section>
              )}

              {target.externalRef && (
                <Section icon={Hash} tone="violet" title="External reference">
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                      {target.externalRef}
                    </code>
                    <button
                      type="button"
                      onClick={copyRef}
                      aria-label="Copy external reference"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Section>
              )}

              {target.gatewayProvider && (
                <Section icon={Building2} tone="sky" title="Gateway">
                  <p className="text-sm font-semibold capitalize text-foreground">
                    {target.gatewayProvider}
                  </p>

                  {target.gatewayAmount != null && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <GatewayFigure
                        label="Gross"
                        value={target.gatewayAmount}
                        currency={target.gatewayCurrency}
                        tone="neutral"
                      />
                      <GatewayFigure
                        label="Fee"
                        value={target.gatewayFee}
                        currency={target.gatewayCurrency}
                        tone="cost"
                      />
                      <GatewayFigure
                        label="Net"
                        value={target.gatewayNetAmount}
                        currency={target.gatewayCurrency}
                        tone="received"
                      />
                    </div>
                  )}

                  {(target.gatewayRef ?? target.gatewayTransactionId) && (
                    <dl className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                      {target.gatewayRef && <RefLine label="Request" value={target.gatewayRef} />}
                      {target.gatewayTransactionId && (
                        <RefLine label="Transaction" value={target.gatewayTransactionId} />
                      )}
                    </dl>
                  )}
                </Section>
              )}

              {target.receiptNumber && (
                <Section icon={ReceiptIcon} tone="primary" title="Receipt">
                  <p className="font-mono text-sm font-semibold text-foreground">
                    {target.receiptNumber}
                  </p>
                  {target.receiptToken && (
                    <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
                      Token · {target.receiptToken.slice(0, 12)}…
                    </p>
                  )}
                </Section>
              )}

              {target.reconciled && (
                <Section icon={BadgeCheck} tone="emerald" title="Reconciliation">
                  {target.reconciledAt && (
                    <p className="text-xs text-muted-foreground">
                      Matched {formatShortDay(target.reconciledAt)} ·{' '}
                      {formatTime24(target.reconciledAt)}
                    </p>
                  )}
                  {target.reconciliationMatchedRef && (
                    <p className="mt-1 text-xs text-foreground">
                      Ref · <span className="font-mono">{target.reconciliationMatchedRef}</span>
                    </p>
                  )}
                  {target.reconciliationNotes && (
                    <p className="mt-1 text-sm leading-relaxed text-foreground">
                      {target.reconciliationNotes}
                    </p>
                  )}
                </Section>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border bg-card px-6 py-4">
              {target.receiptToken && (
                <Button variant="outline" size="sm" onClick={() => onPreviewReceipt(target)}>
                  <ReceiptIcon className="h-3.5 w-3.5" />
                  Receipt
                </Button>
              )}
              {verifyUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(verifyUrl, '_blank', 'noopener')}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Verify
                </Button>
              )}
              {!target.reconciled ? (
                <Button size="sm" onClick={() => onReconcile(target)}>
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Mark reconciled
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => onUndoReconciliation(target)}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Undo reconciliation
                </Button>
              )}
              {canReverse && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReverse(target)}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reverse
                </Button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

type Tone = 'primary' | 'sky' | 'emerald' | 'amber' | 'violet';

const TONES: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  sky: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
};

/**
 * One labelled card. The tinted icon is the anchor the eye lands on
 * when scanning the sheet for a particular field, which is what the
 * operator is almost always doing.
 */
function Section({
  icon: Icon,
  tone,
  title,
  children,
}: {
  readonly icon: LucideIcon;
  readonly tone: Tone;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${TONES[tone]}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

/**
 * One of the three gateway figures. Renders an em dash rather than a
 * zero when the gateway did not report a value — a missing fee and a
 * zero fee are different facts.
 */
function GatewayFigure({
  label,
  value,
  currency,
  tone,
}: {
  readonly label: string;
  readonly value: number | null;
  readonly currency: string | null;
  readonly tone: 'neutral' | 'cost' | 'received';
}) {
  const styles = {
    neutral: 'border-border bg-muted/40 text-foreground',
    cost: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    received: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  }[tone];

  return (
    <div className={`flex flex-col gap-0.5 rounded-lg border px-2 py-1.5 leading-tight ${styles}`}>
      <span className="text-[9.5px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">
        {value == null
          ? '—'
          : `${new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(value)} ${
              currency ?? ''
            }`.trim()}
      </span>
    </div>
  );
}

function RefLine({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground">{value}</dd>
    </div>
  );
}

function ContactLine({
  icon: Icon,
  value,
  href,
}: {
  readonly icon: LucideIcon;
  readonly value: string;
  readonly href?: string;
}) {
  const content = (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {value}
    </span>
  );
  return href ? (
    <a href={href} className="w-fit transition-colors hover:text-primary">
      {content}
    </a>
  ) : (
    content
  );
}

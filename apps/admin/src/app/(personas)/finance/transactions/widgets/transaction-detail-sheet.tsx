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
  Private,
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
 * Everything under that is reference material: quiet labels separated
 * by hairlines, because the panel is already a card and boxing each
 * field inside it again only adds borders to look past.
 *
 * The gateway block keeps gross, fee and net apart — the treasury
 * received the net, not the gross, and a payment that reconciles at
 * gross can still leave the books short.
 *
 * Names and contact details sit inside `Private`, so the whole sheet
 * can be shown on a projector without showing who paid.
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
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
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

            <div className="flex-1 overflow-y-auto px-6">
              <Section icon={Target} title="Paid for">
                <p className="text-sm font-semibold text-foreground">{target.chargeName}</p>
                <p className="text-xs text-muted-foreground">
                  {target.scopeName}
                  {target.chargeShape && ` · ${target.chargeShape}`}
                </p>
              </Section>

              <Section icon={User} title="Payer">
                <Private>
                  <p className="text-sm font-semibold text-foreground">{target.payerLabel}</p>
                </Private>
                <Private as="block" className="mt-1.5 flex flex-col gap-1">
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
                </Private>
              </Section>

              {target.memo && (
                <Section icon={StickyNote} title="Note">
                  <p className="text-sm leading-relaxed text-foreground">{target.memo}</p>
                </Section>
              )}

              {target.externalRef && (
                <Section icon={Hash} title="External reference">
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
                <Section icon={Building2} title="Gateway">
                  <p className="text-sm font-semibold capitalize text-foreground">
                    {target.gatewayProvider}
                  </p>

                  {target.gatewayAmount != null && (
                    <div className="mt-2 grid grid-cols-3 divide-x divide-border rounded-lg bg-muted/40">
                      <GatewayFigure
                        label="Gross"
                        value={target.gatewayAmount}
                        currency={target.gatewayCurrency}
                      />
                      <GatewayFigure
                        label="Fee"
                        value={target.gatewayFee}
                        currency={target.gatewayCurrency}
                      />
                      <GatewayFigure
                        label="Net"
                        value={target.gatewayNetAmount}
                        currency={target.gatewayCurrency}
                        emphasis
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
                <Section icon={ReceiptIcon} title="Receipt">
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
                <Section icon={BadgeCheck} title="Reconciliation">
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

/**
 * One labelled block, separated from its neighbour by a hairline.
 *
 * Cards were wrong here. The sheet is already a card — a panel floating
 * over the page — and boxing each field inside it again drew five more
 * borders the reader has to look past to reach the one line they came
 * for. A quiet label and a rule do the same work and leave the values
 * as the only things with any weight.
 */
function Section({
  icon: Icon,
  title,
  children,
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border py-4 last:border-b-0">
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * One of the three gateway figures. Renders an em dash rather than a
 * zero when the gateway did not report a value — a missing fee and a
 * zero fee are different facts.
 *
 * All three are drawn the same, in one quiet strip. Colouring them
 * separately made a routine settlement look like three warnings; what
 * actually matters is the net, so that is the only one given weight.
 */
function GatewayFigure({
  label,
  value,
  currency,
  emphasis = false,
}: {
  readonly label: string;
  readonly value: number | null;
  readonly currency: string | null;
  readonly emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-2.5 py-2 leading-tight">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-sm tabular-nums ${emphasis ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
      >
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

'use client';

import type { ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Copy,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
} from 'lucide-react';

import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  toast,
  Private,
} from '@shesa/ui';

import { formatShortDay, formatTime24 } from '@/lib/format/date-time';

import type { ChargeSummary, PoolRow } from './charge-detail-types';
import { formatMethod, getInitials } from './shared-formatters';

/**
 * Right-side detail sheet for a single pool payment, opened by clicking
 * a row in the pool table. Same borderless section layout as the
 * mainstream Transactions detail sheet: an amount + status header, then
 * For / Payer / Note / External reference / Receipt / Reconciliation
 * sections (each hidden when empty), and a reconcile / undo footer. The
 * Sheet primitive supplies its own close (X).
 */
export function ChargePoolPaymentSheet({
  open,
  onClose,
  summary,
  payment,
  pending,
  onReconcile,
  onUndo,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly summary: ChargeSummary;
  readonly payment: PoolRow | null;
  readonly pending: boolean;
  readonly onReconcile: (id: string) => void;
  readonly onUndo: (id: string) => void;
}) {
  const copyRef = async () => {
    if (!payment?.externalRef) return;
    try {
      await navigator.clipboard.writeText(payment.externalRef);
      toast.success('External ref copied.');
    } catch {
      toast.error('Could not copy. Copy manually from the field.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {payment && (
          <>
            <SheetHeader className="border-b border-border bg-muted/30 px-6 py-5 pr-14">
              <SheetTitle className="flex flex-col items-start gap-1 text-left">
                <span
                  className={`inline-flex items-center gap-1.5 text-2xl font-semibold tabular-nums ${
                    payment.isReversal ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                  }`}
                >
                  {payment.isReversal ? (
                    <ArrowDownRight className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                  {new Intl.NumberFormat().format(Math.round(payment.amount))}{' '}
                  <span className="text-sm text-muted-foreground">{payment.currency}</span>
                </span>
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {formatMethod(payment.method)} ·{' '}
                  {payment.source === 'auto' ? 'Website' : 'Manual'}
                </span>
              </SheetTitle>
              <SheetDescription className="mt-2 flex flex-col items-start gap-0.5 text-left text-xs text-muted-foreground">
                <span>{formatShortDay(payment.createdAt) ?? '-'}</span>
                <span className="text-sm tabular-nums text-foreground">
                  {formatTime24(payment.createdAt) ?? '-'}
                </span>
              </SheetDescription>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {payment.reconciled ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  >
                    <BadgeCheck className="h-3 w-3" />
                    Reconciled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    Unreconciled
                  </Badge>
                )}
                {payment.isReversal && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  >
                    Reversal
                  </Badge>
                )}
                {payment.isReversedOriginal && !payment.isReversal && (
                  <Badge
                    variant="outline"
                    className="border-destructive/40 bg-destructive/10 text-destructive"
                  >
                    Reversed
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <Section title="For">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{summary.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {summary.scopeName} · {summary.shape}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {payment.attireSize && (
                      <Badge
                        variant="outline"
                        className="border-primary/30 bg-primary/5 text-primary"
                      >
                        Size {payment.attireSize}
                      </Badge>
                    )}
                    {payment.quantity != null && payment.quantity > 0 && (
                      <Badge variant="outline" className="border-border">
                        ×{payment.quantity}
                      </Badge>
                    )}
                  </div>
                </div>
              </Section>

              <Section title="Payer">
                <Private as="block" className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                      {getInitials(payment.payerLabel)}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {payment.payerLabel}
                    </span>
                    {payment.isAnonymous && (
                      <Badge
                        variant="outline"
                        className="border-border text-[10px] uppercase tracking-wider"
                      >
                        Anonymous
                      </Badge>
                    )}
                  </div>
                  {payment.payerEmail && (
                    <ContactLine
                      icon={<Mail className="h-3.5 w-3.5" />}
                      value={payment.payerEmail}
                      href={`mailto:${payment.payerEmail}`}
                    />
                  )}
                  {payment.payerPhone && (
                    <ContactLine
                      icon={<Phone className="h-3.5 w-3.5" />}
                      value={payment.payerPhone}
                      href={`tel:${payment.payerPhone.replace(/\s+/g, '')}`}
                    />
                  )}
                  {payment.payerLocation && (
                    <ContactLine
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      value={payment.payerLocation}
                    />
                  )}
                </Private>
              </Section>

              {payment.memo && (
                <Section title="Note">
                  <p className="text-sm text-foreground">{payment.memo}</p>
                </Section>
              )}

              {payment.externalRef && (
                <Section title="External reference">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-xs text-foreground">
                      {payment.externalRef}
                    </span>
                    <button
                      type="button"
                      onClick={copyRef}
                      aria-label="Copy external reference"
                      className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Section>
              )}

              {payment.receiptNumber && (
                <Section title="Receipt">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-sm text-foreground">
                      {payment.receiptNumber}
                    </span>
                    {payment.receiptToken && (
                      <span className="break-all font-mono text-[10.5px] text-muted-foreground">
                        Token · {payment.receiptToken}
                      </span>
                    )}
                  </div>
                </Section>
              )}

              {payment.reconciled && (
                <Section title="Reconciliation">
                  <div className="flex flex-col gap-1 text-xs">
                    {payment.reconciledAt && (
                      <span className="text-muted-foreground">
                        Reconciled {formatShortDay(payment.reconciledAt)} ·{' '}
                        {formatTime24(payment.reconciledAt)}
                      </span>
                    )}
                    {payment.reconciliationMatchedRef && (
                      <span className="text-foreground">
                        Ref · <span className="font-mono">{payment.reconciliationMatchedRef}</span>
                      </span>
                    )}
                    {payment.reconciliationNotes && (
                      <span className="text-foreground">{payment.reconciliationNotes}</span>
                    )}
                  </div>
                </Section>
              )}
            </div>

            {!payment.isReversal && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
                {payment.reconciled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={pending}
                    disabled={pending}
                    onClick={() => onUndo(payment.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Undo reconciliation
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    loading={pending}
                    disabled={pending}
                    onClick={() => onReconcile(payment.id)}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Mark reconciled
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="border-b border-border py-3 first:pt-0 last:border-b-0">
      <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function ContactLine({
  icon,
  value,
  href,
}: {
  readonly icon: ReactNode;
  readonly value: string;
  readonly href?: string;
}) {
  const content = (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      {value}
    </span>
  );
  return href ? (
    <a href={href} className="hover:text-foreground">
      {content}
    </a>
  ) : (
    content
  );
}

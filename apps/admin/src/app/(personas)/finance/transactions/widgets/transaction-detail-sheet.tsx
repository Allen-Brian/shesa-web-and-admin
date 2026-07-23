'use client';

import {
  BadgeCheck,
  Copy,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Receipt as ReceiptIcon,
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
} from '@shesa/ui';

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
 * Shows the fields the table can't afford to display: payer contact,
 * memo, receipt token/number, reconciliation state, and the actions
 * (Reconcile / Undo / Preview receipt / Reverse) that would otherwise
 * live in the compressed row-actions menu.
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
      toast.error('Could not copy — copy manually from the field.');
    }
  };

  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {target && (
          <>
            <SheetHeader className="border-b border-border bg-muted/30 px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <SheetTitle className="flex flex-col items-start gap-1 text-left">
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    {new Intl.NumberFormat().format(target.amount)}{' '}
                    <span className="text-sm text-muted-foreground">{target.currency}</span>
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {formatMethod(target.method)} · {target.source === 'auto' ? 'Auto' : 'Manual'}
                  </span>
                </SheetTitle>
                <div className="flex flex-col items-end gap-1">
                  <ReconciledPill reconciled={target.reconciled} />
                  {target.reversesPaymentId && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    >
                      Reversal
                    </Badge>
                  )}
                  {alreadyReversed && !target.reversesPaymentId && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    >
                      Reversed
                    </Badge>
                  )}
                </div>
              </div>
              <SheetDescription className="mt-2 text-left text-xs text-muted-foreground">
                {new Date(target.createdAt).toLocaleString()}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <Section title="For">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{target.chargeName}</span>
                  <span className="text-xs text-muted-foreground">
                    {target.scopeName}
                    {target.chargeShape && ` · ${target.chargeShape}`}
                  </span>
                </div>
              </Section>

              <Section title="Payer">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{target.payerLabel}</span>
                    {target.isAnonymousPayer && (
                      <Badge
                        variant="outline"
                        className="border-border text-[10px] uppercase tracking-wider"
                      >
                        Anonymous
                      </Badge>
                    )}
                  </div>
                  {target.payerEmail && (
                    <ContactLine
                      icon={<Mail className="h-3.5 w-3.5" />}
                      value={target.payerEmail}
                      href={`mailto:${target.payerEmail}`}
                    />
                  )}
                  {target.payerPhone && (
                    <ContactLine
                      icon={<Phone className="h-3.5 w-3.5" />}
                      value={target.payerPhone}
                      href={`tel:${target.payerPhone.replace(/\s+/g, '')}`}
                    />
                  )}
                  {target.payerLocation && (
                    <ContactLine
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      value={target.payerLocation}
                    />
                  )}
                </div>
              </Section>

              {target.memo && (
                <Section title="Note">
                  <p className="text-sm text-foreground">{target.memo}</p>
                </Section>
              )}

              {target.externalRef && (
                <Section title="External reference">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-mono text-xs text-foreground">
                      {target.externalRef}
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

              {target.receiptNumber && (
                <Section title="Receipt">
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-sm text-foreground">
                      {target.receiptNumber}
                    </span>
                    {target.receiptToken && (
                      <span className="font-mono text-[10.5px] text-muted-foreground">
                        Token · {target.receiptToken.slice(0, 12)}…
                      </span>
                    )}
                  </div>
                </Section>
              )}

              {target.reconciled && (
                <Section title="Reconciliation">
                  <div className="flex flex-col gap-1 text-xs">
                    {target.reconciledAt && (
                      <span className="text-muted-foreground">
                        Reconciled {new Date(target.reconciledAt).toLocaleString()}
                      </span>
                    )}
                    {target.reconciliationMatchedRef && (
                      <span className="text-foreground">
                        Ref · <span className="font-mono">{target.reconciliationMatchedRef}</span>
                      </span>
                    )}
                    {target.reconciliationNotes && (
                      <span className="text-foreground">{target.reconciliationNotes}</span>
                    )}
                  </div>
                </Section>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border bg-muted/30 px-6 py-4">
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
                  className="text-destructive hover:text-destructive"
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

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
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
  readonly icon: React.ReactNode;
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

function ReconciledPill({ reconciled }: { readonly reconciled: boolean }) {
  return reconciled ? (
    <Badge
      variant="outline"
      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    >
      <BadgeCheck className="h-3 w-3" />
      Reconciled
    </Badge>
  ) : (
    <Badge variant="outline" className="border-border text-muted-foreground">
      Unreconciled
    </Badge>
  );
}

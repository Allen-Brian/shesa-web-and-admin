'use client';

import { Copy, ExternalLink, Printer } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shesa/ui';

import { formatMethod } from './payments-helpers';
import type { PaymentRow } from './payments-types';
import { ReceiptField } from './receipt-field';

interface ReceiptPreviewDialogProps {
  readonly target: PaymentRow | null;
  readonly verifyUrl: string;
  readonly onClose: () => void;
  readonly onCopyUrl: () => void;
}

/**
 * Receipt preview + print dialog. Shows the payment's shareable
 * receipt (with a QR that verifies against the ledger via
 * `verifyUrl`) plus buttons to copy the URL, open verify in a new
 * tab, or print. `print:hidden` on the chrome so browser Print gives
 * a clean receipt with none of the dialog controls.
 *
 * QR uses `api.qrserver.com` — no additional dependencies to keep
 * bundle size flat; the URL is signed at the token level so the QR
 * can't be spoofed without a matching row in `finance.receipts`.
 */
export function ReceiptPreviewDialog({
  target,
  verifyUrl,
  onClose,
  onCopyUrl,
}: ReceiptPreviewDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md print:shadow-none">
        <DialogHeader className="print:hidden">
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>
            Shareable receipt with a QR that verifies against the ledger. Use the browser print
            dialog for paper.
          </DialogDescription>
        </DialogHeader>
        {target && target.receiptToken && (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Shesa
                </div>
                <div className="text-lg font-semibold text-foreground">Payment receipt</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Receipt #
                </div>
                <div className="text-sm text-foreground">{target.receiptNumber ?? '—'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-y border-border py-3 text-sm">
              <ReceiptField label="Amount">
                <span className="font-semibold text-foreground">
                  {new Intl.NumberFormat().format(target.amount)} {target.currency}
                </span>
              </ReceiptField>
              <ReceiptField label="Method">
                <span className="text-foreground">{formatMethod(target.method)}</span>
              </ReceiptField>
              <ReceiptField label="For">
                <span className="text-foreground">{target.chargeName}</span>
              </ReceiptField>
              <ReceiptField label="Payer">
                <span className="text-foreground">{target.payerLabel}</span>
              </ReceiptField>
              <ReceiptField label="Paid on">
                <span className="text-foreground">
                  {new Date(target.createdAt).toLocaleString()}
                </span>
              </ReceiptField>
              <ReceiptField label="Scope">
                <span className="text-foreground">{target.scopeName}</span>
              </ReceiptField>
            </div>
            <div className="flex items-center gap-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(verifyUrl)}`}
                alt="Verify receipt"
                width={120}
                height={120}
                className="rounded-md border border-border bg-white p-1"
              />
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span>Scan or visit to verify:</span>
                <span className="break-all text-[11px] text-foreground">{verifyUrl}</span>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={onCopyUrl}>
            <Copy className="h-4 w-4" />
            Copy URL
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(verifyUrl, '_blank', 'noopener')}
          >
            <ExternalLink className="h-4 w-4" />
            Open verify
          </Button>
          <Button type="button" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

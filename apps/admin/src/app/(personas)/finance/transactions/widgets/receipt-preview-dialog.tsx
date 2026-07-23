'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, ExternalLink, Loader2, Printer } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Logo,
} from '@shesa/ui';

import { formatMethod } from './transactions-helpers';
import type { TransactionRow } from './transactions-types';

interface ReceiptPreviewDialogProps {
  readonly target: TransactionRow | null;
  readonly verifyUrl: string;
  readonly onClose: () => void;
  readonly onCopyUrl: () => void;
}

/**
 * Printable receipt preview. Renders the payment on a Shesa letterhead
 * — full-width primary header bar with the crest + brand, itemised
 * money box, and a self-contained SVG QR code generated locally via
 * the `qrcode` package (no network dependency, no cross-origin `<img>`
 * load — prints reliably).
 *
 * `print:` classes strip the dialog chrome so the browser Print
 * dialog produces a clean receipt sheet.
 */
export function ReceiptPreviewDialog({
  target,
  verifyUrl,
  onClose,
  onCopyUrl,
}: ReceiptPreviewDialogProps) {
  const [qrSvg, setQrSvg] = useState<string>('');
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!verifyUrl) {
      setQrSvg('');
      return;
    }
    let cancelled = false;
    setQrLoading(true);
    QRCode.toString(verifyUrl, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#00000000' },
    })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {
        if (!cancelled) setQrSvg('');
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [verifyUrl]);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden p-0 print:max-w-full print:shadow-none">
        <DialogHeader className="border-b border-border px-6 py-4 print:hidden">
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>
            Verifiable, printable receipt. Print gives you a clean sheet without any of the dialog
            chrome.
          </DialogDescription>
        </DialogHeader>

        {target && target.receiptToken && (
          <article
            id="printable-receipt"
            className="mx-auto flex w-full max-w-[520px] flex-col bg-white text-black print:break-inside-avoid"
            style={{ colorScheme: 'light' }}
          >
            {/* Letterhead */}
            <header
              className="flex items-center gap-4 px-6 py-5 text-white"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 100%, black 10%) 0%, color-mix(in srgb, var(--color-primary) 60%, black 30%) 100%)',
              }}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/30 bg-white/10">
                <Logo size={36} />
              </span>
              <div className="flex-1 leading-tight">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-white/80">
                  Sacred Heart Ex-Students Association
                </p>
                <p className="font-heading text-lg font-light tracking-tight text-white">
                  Payment Receipt
                </p>
              </div>
              <div className="text-right leading-tight">
                <p className="text-[9.5px] font-medium uppercase tracking-[0.22em] text-white/70">
                  Receipt #
                </p>
                <p className="font-mono text-sm font-semibold tracking-[0.1em] text-white">
                  {target.receiptNumber ?? '—'}
                </p>
              </div>
            </header>

            {/* Body */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-6">
              <ReceiptField label="Amount">
                <span className="font-heading text-xl font-light tabular-nums text-black">
                  {new Intl.NumberFormat().format(target.amount)}{' '}
                  <span className="text-xs text-black/50">{target.currency}</span>
                </span>
              </ReceiptField>
              <ReceiptField label="Method">
                <span className="text-sm text-black">{formatMethod(target.method)}</span>
              </ReceiptField>
              <ReceiptField label="For">
                <span className="text-sm text-black">{target.chargeName}</span>
              </ReceiptField>
              <ReceiptField label="Scope">
                <span className="text-sm text-black">{target.scopeName}</span>
              </ReceiptField>
              <ReceiptField label="Payer">
                <span className="text-sm text-black">{target.payerLabel}</span>
              </ReceiptField>
              <ReceiptField label="Paid on">
                <span className="text-sm text-black">
                  {new Date(target.createdAt).toLocaleString()}
                </span>
              </ReceiptField>
            </div>

            {/* Verification block */}
            <div className="mx-6 mb-6 flex items-center gap-4 rounded-md border border-black/10 bg-black/[0.02] p-4">
              <div className="grid h-24 w-24 shrink-0 place-items-center rounded border border-black/10 bg-white p-1.5">
                {qrLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-black/40" />
                ) : qrSvg ? (
                  <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                ) : (
                  <span className="text-[10px] text-black/40">QR unavailable</span>
                )}
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-black/60">
                <span className="font-medium uppercase tracking-[0.16em] text-black/50">
                  Verify
                </span>
                <span className="text-black">Scan or visit</span>
                <span className="break-all font-mono text-[10.5px] text-black/70">{verifyUrl}</span>
              </div>
            </div>

            {/* Footer */}
            <footer
              className="flex items-baseline justify-between gap-4 border-t border-black/10 px-6 py-3 text-[10.5px] text-black/55"
              style={{ background: 'color-mix(in srgb, var(--color-primary) 4%, white)' }}
            >
              <span>Thank you for your contribution.</span>
              <span className="uppercase tracking-[0.22em]">shesaconnect.com</span>
            </footer>
          </article>
        )}

        <DialogFooter className="border-t border-border px-6 py-3 print:hidden">
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

function ReceiptField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/45">
        {label}
      </span>
      {children}
    </div>
  );
}

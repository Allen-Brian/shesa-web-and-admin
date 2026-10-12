'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { toast } from '@shesa/ui';

export function CopyButton({ value, label }: { readonly value: string; readonly label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
          toast.success('Copied.');
        } catch {
          toast.error('Copy failed.');
        }
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {label ?? 'Copy'}
    </button>
  );
}

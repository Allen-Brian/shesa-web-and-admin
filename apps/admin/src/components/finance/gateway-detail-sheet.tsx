'use client';

import { Copy, ExternalLink } from 'lucide-react';

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

/**
 * One detail sheet for both gateway tables — sandbox settlements and
 * payment attempts.
 *
 * They answer the same question from two ends of the same story ("what
 * happened to this payment?"), and the fields that matter are identical:
 * who, what for, how much, what the gateway said. Two near-identical
 * sheets is exactly the duplication that hid a missing authorization check
 * across eight media actions earlier in this codebase, so this is one
 * component fed a list of sections.
 */

export interface DetailField {
  readonly label: string;
  readonly value: string | null;
  /** Renders in a monospace face — ids, references, tokens. */
  readonly mono?: boolean;
  /** Adds a copy button. */
  readonly copyable?: boolean;
}

export interface DetailSection {
  readonly title: string;
  readonly fields: readonly DetailField[];
}

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly subtitle?: string | null;
  /** Rendered beside the title — status pills, mode chips. */
  readonly badges?: readonly { label: string; className?: string }[];
  readonly sections: readonly DetailSection[];
  /** Optional link out, e.g. to the public receipt. */
  readonly link?: { href: string; label: string } | null;
}

export function GatewayDetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  badges = [],
  sections,
  link,
}: Props) {
  const copy = async (value: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    toast.success('Copied.');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex flex-wrap items-center gap-2 text-lg">
            {title}
            {badges.map((b) => (
              <Badge
                key={b.label}
                variant="outline"
                className={`h-5 capitalize ${b.className ?? ''}`}
              >
                {b.label}
              </Badge>
            ))}
          </SheetTitle>
          {subtitle && <SheetDescription>{subtitle}</SheetDescription>}
        </SheetHeader>

        <div className="flex flex-col px-6">
          {sections.map((section) => {
            // A section whose every field is empty is noise, not
            // information — drop it rather than render a list of dashes.
            const shown = section.fields.filter((f) => f.value != null && f.value !== '');
            if (shown.length === 0) return null;

            return (
              <div key={section.title} className="border-b border-border py-3 last:border-b-0">
                <p className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {section.title}
                </p>
                <dl className="flex flex-col gap-1.5">
                  {shown.map((f) => (
                    <div key={f.label} className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-xs text-muted-foreground">{f.label}</dt>
                      <dd
                        className={`min-w-0 break-words text-right text-sm text-foreground ${
                          f.mono ? 'font-mono text-xs' : ''
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {f.value}
                          {f.copyable && f.value && (
                            <button
                              type="button"
                              onClick={() => copy(f.value!)}
                              aria-label={`Copy ${f.label}`}
                              className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>

        {link && (
          <div className="mt-auto border-t border-border bg-muted/30 px-6 py-4">
            <Button variant="outline" size="sm" asChild>
              <a href={link.href} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                {link.label}
              </a>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

'use client';

import * as React from 'react';

import { cn } from '../lib/cn';
import { sanitizeRichHtml } from './serialize';

export interface RichContentProps {
  /** HTML string produced server-side by the Edge Function's TipTap render. */
  html: string;
  className?: string;
}

/**
 * Read-only renderer for announcement bodies. Consumes the
 * server-rendered HTML snapshot from `exco.announcements.body_html`,
 * sanitizes via DOMPurify (belt for the server-side sanitize-html),
 * and injects via `dangerouslySetInnerHTML`.
 */
export function RichContent({ html, className }: RichContentProps) {
  const safe = React.useMemo(() => sanitizeRichHtml(html), [html]);
  return (
    <div
      className={cn('prose prose-sm max-w-none shesa-rich-content', className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

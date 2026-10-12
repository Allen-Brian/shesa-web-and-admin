'use client';

import * as React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  href: string;
  label: string;
  /** Optional custom Link component — pass react-router-dom's Link (with `to` bound to href) or next/link for SPA navigation. Defaults to a plain <a> which triggers a full page load. */
  as?: React.ElementType;
}

/** Small `← Label` link shown above the title on every entity detail page. Router-agnostic: pass `as` from the consuming app to get SPA navigation. */
export function BackLink({ href, label, as: Comp = 'a' }: Props) {
  return (
    <Comp
      href={href}
      className="inline-flex items-center gap-1 text-sm text-primary hover:text-foreground hover:underline"
    >
      <ArrowLeft size={12} />
      {label}
    </Comp>
  );
}

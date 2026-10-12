'use client';

import { useEffect, useState } from 'react';

import { SECTION_NAV } from './strategic-plan-content';

/**
 * Sticky in-page nav that highlights the current section as the user
 * scrolls through the document. Uses IntersectionObserver against the
 * section anchors declared in data.ts, no scroll listener, no libs.
 * Hidden on small screens where the length of the labels would crowd
 * the reading column.
 */
export function StrategicSectionNav() {
  const [active, setActive] = useState<string>(SECTION_NAV[0]?.id ?? '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = SECTION_NAV.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => !!el,
    );
    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <nav
      aria-label="Strategic Plan sections"
      className="pointer-events-none fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 lg:block"
    >
      <ul className="pointer-events-auto flex flex-col gap-2 border-l border-black/10 pl-5">
        {SECTION_NAV.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`group inline-flex items-center gap-3 text-[11px] font-medium uppercase transition-colors ${
                  isActive ? 'text-primary' : 'text-black/45 hover:text-black'
                }`}
                style={{ letterSpacing: '0.22em' }}
              >
                <span
                  aria-hidden
                  className={`h-px transition-all duration-300 ${
                    isActive ? 'w-6 bg-primary' : 'w-2 bg-black/30 group-hover:w-4'
                  }`}
                />
                <span>{s.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

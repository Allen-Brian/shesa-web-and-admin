'use client';

import { motion } from 'framer-motion';

import { GOALS } from './strategic-plan-content';
import { SectionShell } from './section-shell';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function StrategicGoals() {
  return (
    <SectionShell
      id="goals"
      number="4.0"
      eyebrow="Strategic Goals & Priority Areas"
      title="Four goals. Clear priority areas. Measurable outcomes."
      lede="Each goal translates a pillar into a concrete purpose, a set of priority areas the Association will invest in, and the expected outcome by 2030."
      tone="tint"
    >
      <div className="flex flex-col gap-8">
        {GOALS.map((g, i) => (
          <motion.article
            key={g.index}
            /* Anchor target for the home-page goal cards. */
            id={`goal-${g.index}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.85, delay: i * 0.06, ease }}
            className="relative scroll-mt-28 overflow-hidden rounded-xs border border-black/10 bg-white p-6 md:p-8"
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary/80" />
            <div className="grid gap-8 md:grid-cols-12 md:gap-10">
              <div className="md:col-span-4">
                <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
                  Goal 0{g.index}
                </p>
                <h3
                  className="mt-3 font-heading text-2xl font-light text-black md:text-[1.6rem]"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {g.title}
                </h3>
                <p className="mt-2 text-[13px] leading-[1.6] italic text-black/50">{g.subtitle}</p>
                <div className="mt-6 border-t border-black/8 pt-5">
                  <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-primary/80">
                    Purpose
                  </p>
                  <p className="mt-3 text-[13.5px] leading-[1.75] text-black/70">{g.purpose}</p>
                </div>
              </div>

              <div className="md:col-span-8">
                <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-primary/80">
                  Priority areas
                </p>
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {g.priorityAreas.map((a) => (
                    <li key={a.title} className="rounded-xs border border-black/10 bg-white p-4">
                      <p className="font-heading text-[13.5px] font-medium text-black">{a.title}</p>
                      {a.body && (
                        <p className="mt-1.5 text-[12.5px] leading-[1.65] text-black/60">
                          {a.body}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 rounded-xs bg-primary/6 p-5">
                  <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-primary">
                    Expected outcome
                  </p>
                  <p className="mt-2 text-[13.5px] leading-[1.75] text-black/75">{g.outcome}</p>
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </SectionShell>
  );
}

'use client';

import { motion } from 'framer-motion';

import { EXECUTIVE_SUMMARY } from './strategic-plan-content';
import { SectionShell } from './section-shell';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function ExecutiveSummary() {
  return (
    <SectionShell
      id="executive-summary"
      number="1.0"
      eyebrow="Executive Summary"
      title="A defining shift toward a structured, modern SHESA."
    >
      <div className="grid gap-10 md:grid-cols-12 md:gap-14">
        <div className="md:col-span-7">
          <div className="flex flex-col gap-5">
            {EXECUTIVE_SUMMARY.paragraphs.map((p, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.7, delay: i * 0.08, ease }}
                className="text-[15px] leading-[1.85] text-black/75"
              >
                {p}
              </motion.p>
            ))}
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="rounded-xs border border-black/10 bg-white p-6 md:p-8">
            <p className="font-heading text-[10px] font-medium uppercase tracking-[0.32em] text-primary">
              Expected outcomes by 2030
            </p>
            <ul className="mt-6 flex flex-col gap-4">
              {EXECUTIVE_SUMMARY.outcomes.map((o, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease }}
                  className="grid grid-cols-[24px_1fr] gap-3"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 h-1.5 w-1.5 rotate-45 bg-primary"
                    style={{ marginLeft: 8 }}
                  />
                  <span className="text-[13.5px] leading-[1.7] text-black/75">{o}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

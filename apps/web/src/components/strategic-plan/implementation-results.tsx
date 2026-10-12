'use client';

import { motion } from 'framer-motion';

import { ACCOUNTABILITY, MONITORING_INDICATORS, PHASES } from './strategic-plan-content';
import { SectionShell } from './section-shell';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function ImplementationResults() {
  return (
    <SectionShell
      id="implementation"
      number="5.0"
      eyebrow="Implementation & Results Framework"
      title="Three phases. Clear accountability. Measurable KPIs."
      lede="The Strategic Plan is executed in three phases spanning 2026–2030, with responsibility distributed across the Assembly, the Global Executive, and country and branch executives."
    >
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80">
        5.2 · Implementation phases
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
        {PHASES.map((phase, i) => (
          <motion.article
            key={phase.index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.85, delay: i * 0.1, ease }}
            className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-6 md:p-7"
          >
            <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary/80" />
            <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-primary">
              Phase 0{phase.index}
            </p>
            <p
              className="mt-3 font-heading text-lg font-medium text-black"
              style={{ letterSpacing: '-0.005em' }}
            >
              {phase.title}
            </p>
            <p className="mt-1 text-[12px] font-medium tracking-[0.14em] text-black/50">
              {phase.years}
            </p>
            <ul className="mt-6 flex flex-col gap-2.5 border-t border-black/8 pt-5">
              {phase.milestones.map((m, idx) => (
                <li key={idx} className="grid grid-cols-[16px_1fr] items-baseline gap-2">
                  <span
                    aria-hidden
                    className="mt-1 h-1.5 w-1.5 rotate-45 bg-primary/70"
                    style={{ marginLeft: 4 }}
                  />
                  <span className="text-[13px] leading-[1.6] text-black/70">{m}</span>
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>

      <div className="mt-16 grid gap-10 md:grid-cols-12 md:gap-14">
        <div className="md:col-span-6">
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80">
            5.3 · Accountability & responsibilities
          </p>
          <div className="mt-6 overflow-hidden rounded-xs border border-black/10 bg-white">
            <table className="w-full text-left text-[13px] leading-[1.6]">
              <thead className="bg-primary/5 text-black/75">
                <tr>
                  <th className="px-4 py-3 font-heading text-[11px] font-medium uppercase tracking-[0.18em]">
                    Level
                  </th>
                  <th className="px-4 py-3 font-heading text-[11px] font-medium uppercase tracking-[0.18em]">
                    Core responsibilities
                  </th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNTABILITY.map((row) => (
                  <tr key={row.level} className="border-t border-black/6 align-top">
                    <td className="px-4 py-3 font-medium text-black">{row.level}</td>
                    <td className="px-4 py-3 text-black/65">{row.responsibilities}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:col-span-6">
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80">
            5.4 · Core monitoring indicators
          </p>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {MONITORING_INDICATORS.map((k, i) => (
              <motion.li
                key={k}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.05, ease }}
                className="rounded-xs border border-black/10 bg-white p-4"
              >
                <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-primary/80 tabular-nums">
                  KPI · {String(i + 1).padStart(2, '0')}
                </p>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-black/80">{k}</p>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}

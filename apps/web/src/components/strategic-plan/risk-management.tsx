'use client';

import { motion } from 'framer-motion';

import { RISKS } from './strategic-plan-content';
import { SectionShell } from './section-shell';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export function RiskManagement() {
  return (
    <SectionShell
      id="risks"
      number="7.0"
      eyebrow="Risk Management"
      title="Risks named. Mitigations owned."
      lede="Governance, financial, operational, reputational, and external risks, each paired with the mitigation measures the Association will run in parallel."
    >
      <div className="grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
        {RISKS.map((r, i) => (
          <motion.article
            key={r.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.75, delay: i * 0.06, ease }}
            className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-6"
          >
            <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-primary/80" />
            <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
              7.{i + 1} · {r.title}
            </p>

            <div className="mt-5">
              <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-black/50">
                Risks
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {r.risks.map((x, idx) => (
                  <li key={idx} className="text-[13px] leading-[1.65] text-black/75">
                    · {x}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 border-t border-black/8 pt-4">
              <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-primary/80">
                Mitigations
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {r.mitigations.map((x, idx) => (
                  <li
                    key={idx}
                    className="grid grid-cols-[16px_1fr] items-baseline gap-2 text-[13px] leading-[1.65] text-black/75"
                  >
                    <span
                      aria-hidden
                      className="mt-1 h-1.5 w-1.5 rotate-45 bg-primary/70"
                      style={{ marginLeft: 4 }}
                    />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>
        ))}
      </div>
    </SectionShell>
  );
}

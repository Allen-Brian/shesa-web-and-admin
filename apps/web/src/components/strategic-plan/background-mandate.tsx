'use client';

import { motion } from 'framer-motion';

import { BACKGROUND_MANDATE } from './strategic-plan-content';
import { SectionShell } from './section-shell';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface BlockProps {
  readonly number: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly delay?: number;
}

function Block({ number, title, paragraphs, delay = 0 }: BlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.8, delay, ease }}
      className="relative"
    >
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80">
        {number}
      </p>
      <h3
        className="mt-3 font-heading text-xl font-light text-black md:text-[1.4rem]"
        style={{ letterSpacing: '-0.015em' }}
      >
        {title}
      </h3>
      <div className="mt-5 flex flex-col gap-4 border-l border-black/10 pl-5">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-[14.5px] leading-[1.8] text-black/70">
            {p}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

export function BackgroundMandate() {
  return (
    <SectionShell
      id="background"
      number="2.0"
      eyebrow="Background & Mandate"
      title="The context that shaped this plan."
      tone="tint"
    >
      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <Block number="2.1" title="Background" paragraphs={BACKGROUND_MANDATE.background} />
        <Block
          number="2.2"
          title="Strategic context"
          paragraphs={BACKGROUND_MANDATE.strategicContext}
          delay={0.08}
        />
        <Block
          number="2.3"
          title="Rationale for 2026 – 2030"
          paragraphs={BACKGROUND_MANDATE.rationale}
          delay={0.16}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, delay: 0.24, ease }}
          className="relative"
        >
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80">
            2.4
          </p>
          <h3
            className="mt-3 font-heading text-xl font-light text-black md:text-[1.4rem]"
            style={{ letterSpacing: '-0.015em' }}
          >
            Institutional shifts SHESA must undertake
          </h3>
          <ul className="mt-5 flex flex-col gap-3">
            {BACKGROUND_MANDATE.institutionalShifts.map((s, i) => (
              <li
                key={i}
                className="grid grid-cols-[24px_1fr] gap-3 rounded-xs border border-black/10 bg-white p-4"
              >
                <span className="font-heading text-[11px] font-medium text-primary tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-[13.5px] leading-[1.7] text-black/75">{s}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </SectionShell>
  );
}

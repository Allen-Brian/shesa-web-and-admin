'use client';

import { motion } from 'framer-motion';

import { FRAMEWORK } from './strategic-plan-content';
import { SectionShell } from './section-shell';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function StatementCard({
  eyebrow,
  body,
  delay = 0,
}: {
  readonly eyebrow: string;
  readonly body: string;
  readonly delay?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.85, delay, ease }}
      className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-7 md:p-9"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary/80" />
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.32em] text-primary">
        {eyebrow}
      </p>
      <p
        className="mt-6 font-heading font-light leading-[1.5] text-black"
        style={{ fontSize: 'clamp(1.05rem, 1.6vw, 1.35rem)', letterSpacing: '-0.005em' }}
      >
        {body}
      </p>
    </motion.article>
  );
}

export function StrategicFramework() {
  return (
    <SectionShell
      id="framework"
      number="3.0"
      eyebrow="Strategic Framework"
      title="Vision, mission, values, and the pillars that hold them up."
    >
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <StatementCard eyebrow="3.1 · Vision" body={FRAMEWORK.vision} />
        <StatementCard eyebrow="3.2 · Mission" body={FRAMEWORK.mission} delay={0.08} />
      </div>

      <div className="mt-16">
        <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80">
          3.3 · Core values
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {FRAMEWORK.values.map((v, i) => (
            <motion.article
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.75, delay: i * 0.06, ease }}
              className="group relative rounded-xs border border-black/10 bg-white p-5 md:p-6"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-heading text-[10px] font-medium text-primary tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h4
                  className="font-heading text-[15px] font-medium text-black"
                  style={{ letterSpacing: '-0.005em' }}
                >
                  {v.title}
                </h4>
              </div>
              <p className="mt-3 text-[13px] leading-[1.7] text-black/65">{v.body}</p>
            </motion.article>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary/80">
          3.4 · Strategic pillars
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 md:gap-6">
          {FRAMEWORK.pillars.map((p, i) => (
            <motion.article
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.75, delay: i * 0.08, ease }}
              className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-6 md:p-7"
            >
              <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-primary/80" />
              <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-primary">
                Pillar 0{i + 1}
              </p>
              <h4
                className="mt-3 font-heading text-[17px] font-medium leading-tight text-black md:text-[18px]"
                style={{ letterSpacing: '-0.005em' }}
              >
                {p.title}
              </h4>
              <p className="mt-3 text-[13.5px] leading-[1.7] text-black/65">{p.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

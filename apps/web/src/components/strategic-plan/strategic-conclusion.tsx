'use client';

import { motion, type Variants } from 'framer-motion';

import { CONCLUSION } from './strategic-plan-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.08, ease },
  }),
};

export function StrategicConclusion() {
  return (
    <section
      id="conclusion"
      className="relative py-24 text-black md:py-32"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 6%, white) 100%)',
      }}
    >
      <div className="mx-auto max-w-4xl px-5 md:px-8">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="font-heading text-[11px] font-medium uppercase tracking-[0.32em] text-primary"
        >
          9.0 · Conclusion
        </motion.p>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={1}
          className="mt-6 font-heading font-thin leading-[1.1] text-black"
          style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', letterSpacing: '-0.02em' }}
        >
          A defining milestone for SHESA.
        </motion.h2>

        <div className="mt-10 flex flex-col gap-5">
          {CONCLUSION.paragraphs.map((p, i) => (
            <motion.p
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={2 + i}
              className="text-[15px] leading-[1.85] text-black/70 md:text-[15.5px]"
            >
              {p}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion, type Variants } from 'framer-motion';

import { CALL_TO_ACTION } from './strategic-plan-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: i * 0.1, ease },
  }),
};

export function StrategicCallToAction() {
  return (
    <section
      id="call-to-action"
      data-nav-dark
      className="relative isolate overflow-hidden bg-black py-24 text-white md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 65% at 50% 40%, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="relative mx-auto max-w-4xl px-5 md:px-8">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="font-heading text-[11px] font-medium uppercase text-white/60"
          style={{ letterSpacing: '0.5em' }}
        >
          8.0 · Call to Action
        </motion.p>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={1}
          className="mt-8 font-heading font-thin leading-[1.05] text-white"
          style={{ fontSize: 'clamp(1.85rem, 4vw, 3rem)', letterSpacing: '-0.02em' }}
        >
          From intent to action. From affiliation to
          <span className="italic text-primary"> measurable contribution.</span>
        </motion.h2>

        <div className="mt-10 flex flex-col gap-5">
          {CALL_TO_ACTION.paragraphs.map((p, i) => (
            <motion.p
              key={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={2 + i}
              className="text-[15px] leading-[1.85] text-white/70 md:text-[15.5px]"
            >
              {p}
            </motion.p>
          ))}
        </div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={6}
          className="mt-14 font-script text-primary"
          style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.1 }}
        >
          {CALL_TO_ACTION.closing}
        </motion.p>
      </div>
    </section>
  );
}

'use client';

import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.08, ease },
  }),
};

const PILLARS = [
  {
    number: '01',
    title: 'The Assembly',
    body: 'Every branch, every sector, every chapter, under one roof to elect, resolve, and set the year ahead.',
  },
  {
    number: '02',
    title: 'The Ceremony',
    body: 'A gala for the scholars, a moment for the founders, a memory for the record.',
  },
  {
    number: '03',
    title: 'The Handover',
    body: 'From Yaoundé to the next host city, the AGM 2027 committee lifts the torch on the last day.',
  },
];

export function AgmAbout() {
  return (
    <section className="relative bg-white py-20 text-black md:py-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-8 md:grid-cols-12 md:items-end md:gap-14">
          <div className="md:col-span-8">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              What it is
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{ fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)', letterSpacing: '-0.02em' }}
            >
              Three days. <span className="italic text-primary">One assembly.</span>
            </motion.h2>
          </div>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="max-w-md text-[15px] leading-[1.7] text-black/60 md:col-span-4"
          >
            The AGM 2026 is where the SHESA family gathers to decide, celebrate, and pass the torch.
            This year the assembly comes to Yaoundé.
          </motion.p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3 md:gap-8">
          {PILLARS.map((p, i) => (
            <motion.article
              key={p.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.75, delay: i * 0.08, ease }}
              className="relative flex flex-col overflow-hidden rounded-xs border border-black/10 bg-white p-8"
            >
              <span
                className="font-heading text-[80px] font-thin leading-none text-primary/15"
                style={{ letterSpacing: '-0.05em' }}
              >
                {p.number}
              </span>
              <h3
                className="mt-4 font-heading text-xl font-light text-black"
                style={{ letterSpacing: '-0.005em' }}
              >
                {p.title}
              </h3>
              <p className="mt-3 text-[14px] leading-[1.65] text-black/60">{p.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

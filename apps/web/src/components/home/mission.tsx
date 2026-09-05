'use client';

import { motion, type Variants } from 'framer-motion';

import { association } from '@/lib/site-config';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease },
  }),
};

/**
 * The Association's own words, from `site-config`. The section used to
 * carry three written-for-the-site pillars (Connect, Celebrate, Give
 * Back) that read well but were not what SHESA had actually adopted.
 */
const statements = [
  { title: 'Vision', body: association.vision },
  { title: 'Mission', body: association.mission },
] as const;

export function Mission() {
  return (
    <section className="relative overflow-hidden bg-white py-20 text-black md:py-24">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-12 md:grid-cols-12 md:gap-14 lg:gap-20">
          <div className="md:col-span-6">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-lg font-medium uppercase tracking-[0.2em] text-primary"
            >
              Vision &amp; Mission
            </motion.p>

            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{
                fontSize: 'clamp(1.85rem, 3.8vw, 3.85rem)',
                letterSpacing: '-0.02em',
              }}
            >
              A brotherhood forged in schooldays,{' '}
              <span className="italic text-primary">sustained for life.</span>
            </motion.h2>

            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={fadeUp}
              className="mt-6 max-w-md text-[18px] leading-[1.7] text-black/65"
            >
              The direction the Association has set for itself, in its own words, stewarding the
              legacy of <em className="not-italic text-black">Viriliter Age</em> for those still to
              come.
            </motion.p>
          </div>

          <ul className="md:col-span-6 md:pt-3">
            {statements.map((statement, i) => (
              <motion.li
                key={statement.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={i + 1}
                className="group relative border-t border-black/10 py-7 first:border-t-0 first:pt-0 md:py-8"
              >
                <div className="flex items-baseline gap-5 md:gap-8">
                  <span className="shrink-0 font-heading text-3xl tracking-[0.15em] text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <h3
                      className="font-heading font-thin leading-tight text-black"
                      style={{
                        fontSize: 'clamp(1.35rem, 2vw, 1.85rem)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {statement.title}
                    </h3>
                    <p className="mt-3 text-[16px] leading-[1.7] text-black/65">{statement.body}</p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
